"use client";

import { BookOpen, Check, Keyboard, Loader, Shuffle, Volume2, VolumeX } from "lucide-react";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { countRun, DEVICE_LABEL, deviceKind, makeWords, typingLabel, type TypingLang } from "@/lib/typing";
import { loadTypingTexts, progressAfter, textWords, TYPING_CATEGORIES, wordsFrom, type TypingText } from "@/lib/typing-texts";

export interface TypingResult {
  testId: string;
  wpm: number;
  accuracy: number;
  score: number;
  device: "pc" | "mobile";
  minutes: 1 | 5;
  /** Texto mode: how far the person got in the text, to show after the result. */
  moved?: string;
}

type Mode = "words" | "text";
type Minutes = 1 | 5;
// Before a language's texts are loaded, the first text of each one.
const FIRST_TEXT: Record<TypingLang, string> = { pt: "algoritmo", en: "en-algorithm" };
const PREF = "pacto:typing";

const ERRORS: [string, string][] = [
  ["stale typing test", "Seu progresso mudou em outro teste. Atualize a página antes de continuar."],
  ["invalid text", "O texto foi atualizado. Atualize a página e tente novamente."],
  ["no attempts left", "Você já usou as 3 tentativas de hoje."],
  ["timing", "O tempo do teste não bateu (o app ficou em segundo plano?). Faça outro."],
  ["implausible", "Resultado impossível para esse tempo. Faça outro."],
];

/**
 * Typing test of 1 or 5 minutes. The server starts and ends the clock (start/finish_typing_test) and
 * computes the result; this screen shows the words and counts what was typed. Random words or a
 * text about programming, which continues where the person stopped last time; in Portuguese or
 * English. While typing, the text itself is the field: letters light up as they are typed and a
 * caret follows them (as on Monkeytype); a transparent input over it receives the keys.
 */
export function TypingTest({ attemptsLeft, onResult }: { attemptsLeft: number; onResult: (r: TypingResult) => void | Promise<void> }) {
  const [phase, setPhase] = useState<"idle" | "starting" | "running" | "sending" | "done">("idle");
  const [words, setWords] = useState<string[]>([]);
  const [committed, setCommitted] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<TypingResult | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("words");
  const [lang, setLang] = useState<TypingLang>("pt");
  const [minutes, setMinutes] = useState<Minutes>(1);
  // The chosen text of each language, and each language's texts once loaded.
  const [texts, setTexts] = useState<Record<TypingLang, string>>(FIRST_TEXT);
  const textId = texts[lang];
  const [catalog, setCatalog] = useState<Partial<Record<TypingLang, TypingText[]>>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const test = useRef<{ id: string; seconds: number; started: number; device: "pc" | "mobile"; minutes: Minutes; text: TypingText | null; start: number } | null>(null);
  const [typingLang, setTypingLang] = useState<TypingLang>("pt");
  const [focused, setFocused] = useState(false);
  const [sounds, setSounds] = useState(true);
  // Known only in the browser; until then assume audio works, so the server render matches.
  const [audioOk, setAudioOk] = useState(true);
  useEffect(() => setAudioOk("AudioContext" in window), []);
  const run = useRef({ committed: [] as string[], current: "", words: [] as string[] });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  // The last choice (mode, language, length, texts) is remembered on this device; the place in each text is on the server.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF) ?? "{}");
      if (saved.mode === "text" || saved.mode === "words") setMode(saved.mode);
      if (saved.lang === "pt" || saved.lang === "en") setLang(saved.lang);
      if (saved.minutes === 1 || saved.minutes === 5) setMinutes(saved.minutes);
      if (typeof saved.sounds === "boolean") setSounds(saved.sounds);
      const pt = saved.texts?.pt;
      const en = saved.texts?.en;
      setTexts({
        pt: typeof pt === "string" && !pt.startsWith("en-") ? pt : FIRST_TEXT.pt,
        en: typeof en === "string" && en.startsWith("en-") ? en : FIRST_TEXT.en,
      });
    } catch {}
    loadProgress();
  }, []);

  // A language's texts are fetched the first time Texto is chosen in it.
  useEffect(() => {
    if (mode !== "text" || catalog[lang]) return;
    loadTypingTexts(lang).then((list) => setCatalog((c) => ({ ...c, [lang]: list })));
  }, [mode, lang, catalog]);

  function choose(next: { mode?: Mode; lang?: TypingLang; text?: string; minutes?: Minutes }) {
    const m = next.mode ?? mode;
    const l = next.lang ?? lang;
    const len = next.minutes ?? minutes;
    const ts = next.text ? { ...texts, [l]: next.text } : texts;
    setMode(m);
    setLang(l);
    setMinutes(len);
    setTexts(ts);
    try {
      localStorage.setItem(PREF, JSON.stringify({ mode: m, lang: l, minutes: len, texts: ts, sounds }));
    } catch {}
  }

  async function loadProgress() {
    const { data } = await createClient().from("typing_progress").select("text_id, words");
    setProgress(Object.fromEntries((data ?? []).map((r) => [r.text_id as string, Number(r.words)])));
  }

  async function start() {
    setError("");
    setPhase("starting");
    if (sounds && typeof window !== "undefined" && "AudioContext" in window) {
      try {
        audio.current ??= new AudioContext();
        await audio.current.resume();
      } catch { /* audio is optional */ }
    }
    const device = deviceKind();
    let text: TypingText | null = null;
    if (mode === "text") {
      const list = catalog[lang] ?? (await loadTypingTexts(lang));
      text = list.find((t) => t.id === textId) ?? list[0];
    }
    const { data, error } = await createClient().rpc("start_typing_test", {
      p_device: device,
      p_mode: text ? "text" : "words",
      p_text: text?.id ?? null,
      p_lang: lang,
      p_minutes: minutes,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível começar. Tente de novo.");
      setPhase("idle");
      return;
    }
    const start = Number(row.start_word ?? 0);
    // Enough words for a very fast typist: the test never runs out.
    const list = text ? wordsFrom(text, start, 200 * minutes).words : makeWords(200 * minutes, Math.random, lang);
    setTitle(text?.title ?? "");
    setTypingLang(lang);
    run.current = { committed: [], current: "", words: list };
    setWords(list);
    setCommitted([]);
    setCurrent("");
    test.current = { id: row.test_id, seconds: row.seconds, started: Date.now(), device, minutes, text, start };
    setLeft(row.seconds);
    setPhase("running");
    requestAnimationFrame(() => input.current?.focus());
    timer.current = setInterval(() => {
      const t = test.current!;
      const remaining = Math.max(0, Math.ceil(t.seconds - (Date.now() - t.started) / 1000));
      setLeft(remaining);
      if (remaining === 0) finish();
    }, 200);
  }

  async function finish() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const t = test.current;
    if (!t) return;
    test.current = null;
    setPhase("sending");
    const { correct, typed } = countRun(run.current.words, run.current.committed, run.current.current);
    const text = t.text;
    const words = run.current.committed.length;
    const place = text ? progressAfter(text, t.start, words) : null;
    const { data, error } = await createClient().rpc("finish_typing_test", {
      p_test: t.id,
      p_correct: correct,
      p_typed: typed,
      p_words: words,
      p_text_words: place?.total ?? null,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      setError(ERRORS.find(([k]) => error?.message.includes(k))?.[1] ?? "Não foi possível salvar o resultado.");
      setPhase("idle");
      return;
    }
    const r: TypingResult = { testId: t.id, wpm: Number(row.wpm), accuracy: Number(row.accuracy), score: Number(row.score), device: t.device, minutes: t.minutes };
    if (text && place) {
      const pct = Math.round((place.words / place.total) * 100);
      r.moved = place.laps
        ? `Você chegou ao fim de “${text.title}”${place.words ? ` e seguiu para a volta seguinte (${pct}%)` : ""}.`
        : `Avançou ${words} ${words === 1 ? "palavra" : "palavras"} em “${text.title}” (${pct}%).`;
      setProgress((p) => ({ ...p, [text.id]: place.words }));
    }
    setResult(r);
    setPhase("done");
    await onResult(r);
  }

  function type(value: string) {
    if (phase !== "running") return;
    // A space (or several) ends the word.
    if (/\s/.test(value)) {
      const word = value.trim();
      if (!word) return setCurrent("");
      run.current.committed = [...run.current.committed, word];
      run.current.current = "";
      setCommitted(run.current.committed);
      setCurrent("");
      return;
    }
    if (sounds && value.length > run.current.current.length) {
      const target = run.current.words[run.current.committed.length] ?? "";
      const previous = run.current.current.length;
      for (let i = previous; i < value.length; i++) playKeyTone(value[i] === target[i]);
    }
    run.current.current = value;
    setCurrent(value);
  }

  // On by default (owner's decision, 03/11/2026); one tap turns it off, also mid-test, and the choice is kept.
  async function toggleSounds() {
    const enabled = !sounds;
    setSounds(enabled);
    try {
      const saved = JSON.parse(localStorage.getItem(PREF) ?? "{}");
      localStorage.setItem(PREF, JSON.stringify({ ...saved, sounds: enabled }));
    } catch {}
    if (enabled && "AudioContext" in window) {
      try {
        audio.current ??= new AudioContext();
        await audio.current.resume();
      } catch { /* audio is optional */ }
    }
    // Mid-test the button must not steal the keyboard from the board.
    if (phase === "running") input.current?.focus();
  }

  function playKeyTone(correct: boolean) {
    try {
      const ctx = audio.current;
      if (!ctx || ctx.state !== "running") return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = correct ? 660 : 190;
      gain.gain.setValueAtTime(0.018, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
    } catch { /* audio is optional */ }
  }

  /**
   * Backspace on an empty word goes back into the previous one when it was typed wrong (as on
   * Monkeytype), so it can be fixed. A word typed right stays done. The result is counted from the
   * final words, so a fixed word counts as right.
   */
  function back(): boolean {
    const r = run.current;
    const n = r.committed.length;
    if (phase !== "running" || r.current !== "" || n === 0 || r.committed[n - 1] === r.words[n - 1]) return false;
    r.current = r.committed[n - 1];
    r.committed = r.committed.slice(0, -1);
    setCommitted(r.committed);
    setCurrent(r.current);
    return true;
  }

  // Phones often send no usable key for Backspace on an empty field, only a "delete" input event.
  useEffect(() => {
    const el = input.current;
    if (!el || phase !== "running") return;
    const onBeforeInput = (e: InputEvent) => {
      if (e.inputType === "deleteContentBackward" && el.value === "" && back()) e.preventDefault();
    };
    el.addEventListener("beforeinput", onBeforeInput);
    return () => el.removeEventListener("beforeinput", onBeforeInput);
  });

  const at = committed.length;

  // Icon only in the card's top-right corner (owner's decision, 04/11/2026); the name and aria-pressed carry the
  // state for screen readers, the tooltip for the mouse. The card is `relative` (TodayChecklist). No audio, no button.
  const soundButton = audioOk && (
    <button
      type="button"
      className="btn-secondary absolute right-2 top-2 !h-11 !min-h-11 !w-11 !p-0"
      aria-pressed={sounds}
      aria-label={sounds ? "Som ligado" : "Som desligado"}
      title={sounds ? "Som ligado: toque para desligar" : "Som desligado: toque para ligar"}
      onClick={toggleSounds}
      data-testid="typing-sounds"
    >
      {sounds ? <Volume2 size={20} aria-hidden /> : <VolumeX size={20} aria-hidden />}
    </button>
  );
  return (
    <div className="space-y-3" data-testid="typing-test" data-phase={phase}>
      {soundButton}
      {phase === "idle" || phase === "starting" ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Idioma</span>
            <Segmented
              label="Idioma"
              value={lang}
              options={[
                ["pt", "Português"],
                ["en", "English"],
              ]}
              onChange={(l) => choose({ lang: l })}
              testid="typing-lang"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Duração</span>
            <Segmented
              label="Duração"
              value={minutes}
              options={[
                [1, "1 min"],
                [5, "5 min"],
              ]}
              onChange={(m) => choose({ minutes: m })}
              testid="typing-minutes"
            />
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="O que digitar">
            {(
              [
                ["words", "Palavras", "Comuns, em ordem aleatória", Shuffle],
                ["text", "Texto", "Programação, para ler digitando", BookOpen],
              ] as const
            ).map(([m, label, hint, Icon]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => choose({ mode: m })}
                data-testid={`typing-mode-${m}`}
                className={`flex min-h-20 flex-col items-start gap-1 rounded-sm border-2 p-3 text-left shadow-[3px_3px_0_var(--color-hard-shadow)] ${
                  mode === m ? "border-accent bg-raised" : "border-bevel-dark bg-bg hover:bg-raised"
                }`}
              >
                <span className={`pixel flex items-center gap-2 text-lg uppercase leading-5 ${mode === m ? "text-accent" : ""}`}>
                  <Icon size={18} aria-hidden /> {label}
                </span>
                <span className="text-xs text-muted">{hint}</span>
              </button>
            ))}
          </div>
          {mode === "text" && <TextPicker texts={catalog[lang]} lang={lang} selected={textId} progress={progress} onPick={(id) => choose({ text: id })} />}
          <p className="text-sm text-muted">
            {minutes === 5 ? "5 minutos" : "1 minuto"} digitando {mode === "text" ? "o texto, lendo enquanto digita" : "as palavras que aparecem"}.
            {minutes === 5 && " O recorde de 5 minutos é separado; nos pontos do dia vale o seu melhor teste."} Vale a melhor de {attemptsLeft === 3 ? "3 tentativas" : `${attemptsLeft} ${attemptsLeft === 1 ? "tentativa restante" : "tentativas restantes"}`} hoje. Colar não funciona.
          </p>
          <button className="btn-primary w-full" onClick={start} disabled={attemptsLeft <= 0 || phase === "starting"}>
            {phase === "starting" ? <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" /> : <Keyboard size={18} aria-hidden />}
            {attemptsLeft <= 0 ? "Sem tentativas hoje" : "Começar teste"}
          </button>
        </>
      ) : phase === "done" && result ? (
        <p className="pixel text-2xl uppercase" data-testid="typing-result" role="status">
          {typingLabel(result)} <span className="text-base text-muted">· {DEVICE_LABEL[result.device]}</span>
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="pixel tabular text-4xl font-bold leading-10 text-accent" aria-live="off">
                {phase === "sending" ? "…" : left >= 60 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : left}
              </p>
              {title && <p className="truncate text-sm text-muted">{title}</p>}
            </div>
            <p className="tabular shrink-0 text-sm text-muted">{committed.length} palavras</p>
          </div>
          <Board words={words} committed={committed} current={current} lang={typingLang} focused={focused} running={phase === "running"}>
            <input
              ref={input}
              // Transparent, over the text: tapping the text opens the keyboard on phones.
              className="absolute inset-0 h-full w-full cursor-text resize-none opacity-0"
              aria-invalid={!!current && !(words[at] ?? "").startsWith(current)}
              value={current}
              onChange={(e) => type(e.target.value)}
              onKeyDown={(e) => e.key === "Backspace" && back() && e.preventDefault()}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={phase !== "running"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={`Digite aqui. Palavra atual: ${words[at] ?? ""}`}
              data-testid="typing-input"
            />
          </Board>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
    </div>
  );
}

/** One word, letter by letter: typed letters right or wrong, extras in red, a wrong word underlined. */
const Word = memo(function Word({ target, typed, state, caret }: { target: string; typed: string; state: "done" | "current" | "next"; caret: boolean }) {
  const wrongWord = state === "done" && typed !== target;
  const letters = [...target];
  const extra = [...typed].slice(letters.length);
  const caretAt = caret ? [...typed].length : -1;
  const bar = <span aria-hidden className="absolute -left-px top-1 bottom-1 w-0.5 bg-accent animate-[caret-blink_1s_infinite] motion-reduce:animate-none" />;
  return (
    <span
      className={`relative mr-[0.55em] inline-block align-top ${wrongWord ? "underline decoration-fail decoration-2 underline-offset-4" : ""}`}
      data-testid={state === "current" ? "typing-word-current" : undefined}
    >
      {letters.map((ch, i) => {
        const t = typed[i];
        const cls = state === "next" || t === undefined ? (state === "done" ? "text-muted/75" : "text-muted") : t === ch ? "text-fg" : "text-fail";
        return (
          <span key={i} className={`relative ${cls}`}>
            {caretAt === i && bar}
            {ch}
          </span>
        );
      })}
      {extra.map((ch, i) => (
        <span key={`x${i}`} className="relative text-fail/70">
          {ch}
        </span>
      ))}
      {caretAt >= Math.max(letters.length, [...typed].length) && <span className="relative">{bar}</span>}
    </span>
  );
});

/**
 * The text as the typing field: three lines, scrolling a line at a time so the current word stays
 * on the first or second line. Children: the transparent input that receives the keys.
 */
function Board({
  words,
  committed,
  current,
  lang,
  focused,
  running,
  children,
}: {
  words: string[];
  committed: string[];
  current: string;
  lang: TypingLang;
  focused: boolean;
  running: boolean;
  children: React.ReactNode;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const at = committed.length;

  useLayoutEffect(() => {
    const box = inner.current;
    const el = box?.querySelector<HTMLElement>('[data-testid="typing-word-current"]');
    if (!box || !el) return;
    // Keep one finished line above the current one: scroll to the top of the previous line, measured
    // from the words themselves (line boxes can be taller than the line-height).
    const tops = [...box.children].map((w) => (w as HTMLElement).offsetTop);
    const above = tops.filter((t) => t < el.offsetTop);
    setScroll(above.length ? Math.max(...above) - tops[0] : 0);
  }, [at, words]);

  // Every word from the first is drawn (memoized, so only the words that change re-render): drawing
  // a sliding window shifted all line breaks at each word and made the text move around.
  return (
    <div className={`relative h-[128px] overflow-hidden rounded-sm border-2 bg-bg px-3 py-2 ${focused || !running ? "border-bevel-dark" : "border-control"}`}>
      <div
        ref={inner}
        lang={lang === "en" ? "en" : "pt-BR"}
        aria-label="Palavras do teste"
        className="text-xl leading-9 transition-transform duration-100 motion-reduce:transition-none"
        style={{ transform: `translateY(-${scroll}px)` }}
      >
        {words.slice(0, at + 60).map((w, n) => {
          const state = n < at ? "done" : n === at ? "current" : "next";
          return <Word key={n} target={w} typed={n < at ? committed[n] : n === at ? current : ""} state={state} caret={n === at && running} />;
        })}
      </div>
      {running && !focused && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg/85 text-sm font-semibold">Toque no texto para continuar</p>
      )}
      {children}
    </div>
  );
}

/** A small two-option switch (language, length). */
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  testid,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  testid: string;
}) {
  return (
    <div className="flex rounded-sm border-2 border-bevel-dark bg-bg p-0.5" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          className={`min-h-11 min-w-20 rounded-sm px-3 text-sm font-semibold ${value === v ? "bg-accent text-on-accent" : "text-muted hover:text-fg"}`}
          onClick={() => onChange(v)}
          data-testid={`${testid}-${v}`}
          lang={v === "en" ? "en" : undefined}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const pct = (t: TypingText, words: number | undefined) => Math.round(((words ?? 0) / textWords(t).length) * 100);

/** The texts of one language, filtered by a category chip, each with how far the person got. */
function TextPicker({
  texts,
  lang,
  selected,
  progress,
  onPick,
}: {
  texts: TypingText[] | undefined;
  lang: TypingLang;
  selected: string;
  progress: Record<string, number>;
  onPick: (id: string) => void;
}) {
  const [cat, setCat] = useState<string | null>(null);
  if (!texts) return <p className="text-sm text-muted" role="status">Carregando os textos…</p>;
  const chosen = texts.find((t) => t.id === selected) ?? texts[0];
  const category = cat ?? chosen.category;
  const list = texts.filter((t) => t.category === category);
  const preview = wordsFrom(chosen, progress[chosen.id] ?? 0, 9).words.join(" ");

  return (
    <div className="space-y-2" data-testid="typing-texts">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Assuntos">
        {TYPING_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === category}
            onClick={() => {
              setCat(c);
              // The chosen text always belongs to the topic on screen (the preview describes it).
              if (chosen.category !== c) onPick(texts.find((t) => t.category === c)!.id);
            }}
            className={`min-h-11 shrink-0 rounded-sm border-2 px-3 text-sm font-semibold ${
              c === category ? "border-accent bg-raised text-accent" : "border-bevel-dark bg-bg text-muted hover:text-fg"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="space-y-1.5" role="radiogroup" aria-label={`Textos de ${category}`}>
        {list.map((t) => {
          const p = pct(t, progress[t.id]);
          const on = t.id === chosen.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(t.id)}
                data-testid={`typing-text-${t.id}`}
                lang={t.lang === "en" ? "en" : "pt-BR"}
                className={`flex min-h-14 w-full items-center gap-3 rounded-sm border-2 px-3 py-2 text-left ${on ? "border-accent bg-raised" : "border-bevel-dark bg-bg hover:bg-raised"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-5">{t.title}</span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-divider">
                      <span className="block h-full bg-accent" style={{ width: `${p}%` }} />
                    </span>
                    <span className="tabular w-11 shrink-0 text-right text-xs text-muted">{p ? `${p}%` : "Novo"}</span>
                  </span>
                </span>
                {on && <Check size={18} aria-hidden className="shrink-0 text-accent" />}
              </button>
            </li>
          );
        })}
      </ul>
      {preview && (
        <p className="rounded-sm border-l-[3px] border-accent bg-bg px-3 py-2 text-sm text-muted" data-testid="typing-preview">
          {progress[chosen.id] ? "Continua em: " : "Começa com: "}
          <span className="text-fg" lang={lang === "en" ? "en" : "pt-BR"}>
            {preview}…
          </span>
        </p>
      )}
    </div>
  );
}
