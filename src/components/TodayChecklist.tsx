"use client";

/* eslint-disable @next/next/no-img-element -- local previews and signed URLs */
import { Camera, Check, ChevronRight, Clock, Keyboard, Loader, Plus, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AiBadge, TribunalBadge } from "@/components/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import type { Verdict } from "@/lib/ai-review";
import { GOAL_SPRITE } from "@/lib/goal-icons";
import { Sprite } from "@/components/Sprite";
import { TypingCard, type TypingScore } from "@/components/TypingCard";
import type { TypingResult } from "@/components/TypingTest";
import { DEVICE_LABEL } from "@/lib/typing";
import { compressProofPhotos, mediaPath, thumbPath } from "@/lib/image";
import { photoAgeLabel, photoTakenAt } from "@/lib/photo-date";
import { spToday } from "@/lib/dates";
import { promptOfDay } from "@/lib/study-prompts";
import { createClient } from "@/lib/supabase/client";
import { normalizeGitHubRepoUrl, validateAttachment } from "@/lib/attachments";
import { attachmentCopy, attachmentSize } from "@/components/CheckinAttachments";
import { checkinNumbers, goalMeta, GOALS, MAX_EXTRA_SESSIONS, MAX_PHOTOS, MIN_EXTRA_MINUTES, MIN_STUDY_MINUTES, MIN_SUMMARY, PROJECT, type DisputeStatus, type Goal } from "@/lib/types";

/** The proof this page just sent ("extra" for an extra session): its row plays the sheet animation once. */
let justSent: string | null = null;

// Completed days do not need to download the interactive typing board.
const TypingTest = dynamic(() => import("@/components/TypingTest").then((m) => m.TypingTest), {
  loading: () => <p role="status" className="min-h-12 text-sm text-muted">Carregando teste…</p>,
});

export interface DoneGoal {
  id: string;
  goal: Goal;
  dispute: DisputeStatus | null;
  review: Verdict | null;
  summary: string | null;
  minutes: number | null;
  pages: number | null;
  title: string | null;
  photoUrl: string | null;
  /** "Foto de 3 dias atrás" when the photo predates the proof's day. */
  photoAge: string | null;
}

interface Props {
  groupId: string;
  userId: string;
  /** The latest proof of each goal today (a retake replaces the proof it retakes). */
  done: DoneGoal[];
  /** Extra study sessions sent today. */
  extras: DoneGoal[];
  /** Today's typing tests: how many were used and the best result. */
  typing: { used: number; best: string | null; bestScore: TypingScore | null };
}

type FormMode = "first" | "retake" | "extra";

export function TodayChecklist({ groupId, userId, done, extras, typing }: Props) {
  const doneBy = new Map(done.map((d) => [d.goal, d]));
  const project = doneBy.get("project");
  const anyDone = GOALS.some((g) => doneBy.has(g.id));
  return (
    <>
      <section aria-labelledby="metas" className="mb-8">
        <h2 id="metas" className="pixel mb-3 text-2xl uppercase leading-7">
          Metas
        </h2>
        {/* Stable order (study → typing → reading): cards never move while someone is typing. */}
        <div className="space-y-3">
          {GOALS.map((g) => {
            const d = doneBy.get(g.id);
            if (g.id === "typing") return <TypingGoal key={g.id} done={d} groupId={groupId} userId={userId} typing={typing} />;
            if (!d) return <GoalForm key={g.id} goal={g.id} groupId={groupId} userId={userId} />;
            // Condemned today: the proof can be retaken until 23:59 (the database enforces the day).
            if (d.dispute === "upheld") {
              return (
                <div key={g.id} className="space-y-2">
                  <DoneRow item={d} />
                  <GoalForm goal={g.id} groupId={groupId} userId={userId} mode="retake" />
                </div>
              );
            }
            if (g.id === "study") {
              return (
                <div key={g.id} className="space-y-2">
                  <DoneRow item={d} />
                  <ExtraSessions extras={extras} groupId={groupId} userId={userId} />
                </div>
              );
            }
            return <DoneRow key={g.id} item={d} />;
          })}
        </div>
        {anyDone && <p className="mt-3 text-sm text-muted">Provas enviadas não podem ser editadas, só contestadas pelo grupo.</p>}
      </section>

      <section aria-labelledby="projeto">
        <h2 id="projeto" className="pixel text-2xl uppercase leading-7">
          Projeto opcional
        </h2>
        <p className="mb-3 text-sm text-muted">Não conta para as 3 metas. Vale poucos pontos no ranking, no máximo 1 por dia.</p>
        {project ? <DoneRow item={project} /> : <GoalForm goal={PROJECT.id} groupId={groupId} userId={userId} />}
      </section>
    </>
  );
}

function ExtraSessions({ extras, groupId, userId }: { extras: DoneGoal[]; groupId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const left = MAX_EXTRA_SESSIONS - extras.length;
  return (
    <div data-testid="extra-sessions" className="space-y-2">
      {extras.map((e) => (
        <DoneRow key={e.id} item={e} label="Sessão extra" />
      ))}
      {open ? (
        <GoalForm goal="study" groupId={groupId} userId={userId} mode="extra" onDone={() => setOpen(false)} />
      ) : (
        left > 0 && (
          <button className="btn-secondary w-full" onClick={() => setOpen(true)}>
            <Plus size={18} aria-hidden /> Sessão extra de estudo
          </button>
        )
      )}
    </div>
  );
}

/**
 * Typing: the test inside the app is the proof. The first finished test sends the goal (with a
 * picture of the result card for lists and the tribunal); the other attempts can only raise the
 * day's best, which is what scores.
 */
function TypingGoal({ done, groupId, userId, typing }: { done?: DoneGoal; groupId: string; userId: string; typing: Props["typing"] }) {
  const router = useRouter();
  const [again, setAgain] = useState(false);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState("");
  const left = Math.max(0, 3 - typing.used);
  const retake = done?.dispute === "upheld";
  const needsProof = !done || retake;

  async function sendProof(r: TypingResult) {
    setError("");
    setMoved(r.moved ?? "");
    try {
      const card = await resultCard(r);
      const supabase = createClient();
      const path = mediaPath(groupId, userId, "typing");
      const media = supabase.storage.from("media");
      const [up] = await Promise.all([
        media.upload(path, card, { contentType: "image/jpeg", upsert: false }),
        media.upload(thumbPath(path), card, { contentType: "image/jpeg", upsert: false }).catch(() => null),
      ]);
      if (up.error) throw new Error();
      const { error } = await supabase.from("checkins").insert({ goal: "typing", photo_path: path, typing_test_id: r.testId });
      if (error) throw new Error();
      fetch("/api/progress", { method: "POST", keepalive: true }).catch(() => {});
    } catch {
      setError("O resultado foi salvo, mas a meta não foi enviada. Faça outro teste para tentar de novo.");
    }
    router.refresh();
  }

  if (needsProof) {
    return (
      <div className="space-y-2">
        {retake && done && <DoneRow item={done} />}
        <section className={`card relative ${retake ? "!border-warn" : ""}`} data-goal="typing" data-state={retake ? "retake" : "pending"} aria-labelledby="typing-title">
          {/* pr-12 leaves the top-right corner to the sound button inside TypingTest. */}
          <div className="mb-3 flex items-center gap-3 pr-12">
            {retake ? <RotateCcw size={24} aria-hidden className="shrink-0 text-warn" /> : <Sprite name={GOAL_SPRITE.typing} dim />}
            <div className="min-w-0 flex-1">
              <h3 id="typing-title" className="pixel text-xl uppercase leading-6">
                {retake ? "Refazer digitação" : "Digitação"}
              </h3>
              <p className="text-sm text-muted">{retake ? "O grupo condenou a prova. Faça um teste novo até 23:59." : "Teste de 1 minuto aqui no app"}</p>
            </div>
          </div>
          <TypingTest attemptsLeft={left} onResult={sendProof} />
          {error && (
            <p role="alert" className="mt-2 text-sm text-fail">
              {error}
            </p>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DoneRow item={{ ...done!, typingBest: typing.best, typingScore: typing.bestScore }} />
      {moved && !again && (
        <p className="px-1 text-sm text-muted" role="status" data-testid="typing-moved">
          {moved}
        </p>
      )}
      {again ? (
        <section className="card relative pt-14" data-goal="typing" data-state="again" aria-label="Tentar de novo">
          <TypingTest
            attemptsLeft={left}
            onResult={(r) => {
              // Back to the summary row, now with the new best (if it is better).
              setMoved(r.moved ?? "");
              setAgain(false);
              router.refresh();
            }}
          />
        </section>
      ) : (
        left > 0 && (
          <button className="btn-secondary w-full" onClick={() => (setAgain(true), setMoved(""))}>
            <Keyboard size={18} aria-hidden /> Tentar de novo ({left} {left === 1 ? "restante" : "restantes"})
          </button>
        )
      )}
    </div>
  );
}

/** A picture of the result (lists and the tribunal show proofs as photos). */
async function resultCard(r: TypingResult): Promise<Blob> {
  const c = document.createElement("canvas");
  c.width = c.height = 480;
  const g = c.getContext("2d")!;
  g.fillStyle = "#26292e";
  g.fillRect(0, 0, 480, 480);
  g.strokeStyle = "#ffcd38";
  g.lineWidth = 8;
  g.strokeRect(12, 12, 456, 456);
  g.textAlign = "center";
  g.fillStyle = "#bdb7a8";
  g.font = "bold 30px sans-serif";
  g.fillText("TESTE DE DIGITAÇÃO", 240, 110);
  g.fillStyle = "#ffcd38";
  g.font = "bold 120px sans-serif";
  g.fillText(String(Math.round(r.wpm)), 240, 260);
  g.font = "bold 40px sans-serif";
  g.fillText("WPM", 240, 315);
  g.fillStyle = "#f5f1e6";
  g.font = "28px sans-serif";
  g.fillText(`${Math.round(r.accuracy * 100)}% de precisão · ${DEVICE_LABEL[r.device]}${r.minutes === 5 ? " · 5 min" : ""}`, 240, 380);
  g.fillStyle = "#bdb7a8";
  g.font = "22px sans-serif";
  g.fillText(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }), 240, 425);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("card"))), "image/jpeg", 0.85));
}

function DoneRow({ item, label }: { item: DoneGoal & { typingBest?: string | null; typingScore?: TypingScore | null }; label?: string }) {
  const g = goalMeta(item.goal);
  const value = item.typingBest ?? checkinNumbers(item);
  const annulled = item.dispute === "upheld";
  const kind = label ? "extra" : item.goal;
  const [settle] = useState(() => justSent === kind);
  useEffect(() => {
    if (settle) justSent = null;
  }, [settle]);
  return (
    <Link
      href={`/checkin/${item.id}`}
      className="card doc-tab flex min-h-[88px] items-center gap-3 p-3 transition-colors duration-150 hover:bg-raised"
      data-goal={item.goal}
      data-state={annulled ? "annulled" : "done"}
    >
      <Sprite name={GOAL_SPRITE[item.goal]} dim={annulled} />
      <span className="min-w-0 flex-1">
        <span className="pixel block text-lg uppercase leading-5">{label ?? g.label}</span>
        {value && <span className="tabular mt-0.5 block break-words text-sm text-muted">{value}</span>}
        <span className="mt-1 flex flex-wrap gap-1">
          {item.dispute ? (
            <TribunalBadge status={item.dispute} />
          ) : (
            <>
              <span className="paper-label">
                <Check size={14} aria-hidden />
                Prova enviada
              </span>
              {item.review && <AiBadge state={item.review} />}
              {item.photoAge && (
                <Badge tone="pending" icon={Clock}>
                  {item.photoAge}
                </Badge>
              )}
            </>
          )}
        </span>
      </span>
      <span className={`shrink-0 ${settle ? "animate-[sheet-in_180ms_steps(3)_both] motion-reduce:animate-none" : ""}`}>
        {item.typingScore ? (
          <TypingCard t={item.typingScore} size="thumb" />
        ) : item.photoUrl ? (
          <img src={item.photoUrl} alt="" className="block h-14 w-14 rounded-sm border-2 border-bevel-dark object-cover" />
        ) : (
          <span className="block h-14 w-14 rounded-sm bg-raised" />
        )}
      </span>
      <ChevronRight size={20} aria-hidden className="shrink-0 text-muted" />
    </Link>
  );
}

function GoalForm({ goal, groupId, userId, mode = "first", onDone }: { goal: Goal; groupId: string; userId: string; mode?: FormMode; onDone?: () => void }) {
  const router = useRouter();
  const g = goalMeta(goal);
  const extra = mode === "extra";
  const minMinutes = extra ? MIN_EXTRA_MINUTES : MIN_STUDY_MINUTES;
  // The study summary answers the question of the day (same one all day, retakes included).
  const question = goal === "study" && !extra ? promptOfDay(userId, spToday()) : null;
  // Up to MAX_PHOTOS photos; the first one is the main photo (lists and thumbnails).
  const [shots, setShots] = useState<{ file: File; url: string; takenAt?: Date | null }[]>([]);
  const [summary, setSummary] = useState("");
  const [minutes, setMinutes] = useState("");
  const [pages, setPages] = useState("");
  const [title, setTitle] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);

  const minutesOk = goal !== "study" || Number(minutes) >= minMinutes;
  const pagesOk = goal !== "reading" || Number(pages) >= 1;
  const titleOk = goal !== "project" || title.trim().length >= 3;
  const normalizedProjectUrl = goal === "project" ? normalizeGitHubRepoUrl(projectUrl) : null;
  const projectUrlOk = goal !== "project" || !!normalizedProjectUrl;
  const summaryOk = goal !== "study" || extra || summary.trim().length >= MIN_SUMMARY;
  const ready = shots.length > 0 && minutesOk && pagesOk && titleOk && projectUrlOk && summaryOk;

  // What is still missing, in words, next to the disabled button.
  const missing = [
    !titleOk && "dê um nome ao projeto",
    !projectUrlOk && "informe o repositório no GitHub",
    shots.length === 0 && "adicione a foto",
    goal === "study" && !minutesOk && `informe pelo menos ${minMinutes} min`,
    goal === "reading" && !pagesOk && "informe as páginas lidas",
    goal === "study" && !summaryOk && "responda à pergunta do dia",
  ].filter(Boolean) as string[];
  const missingText =
    missing.length === 0 ? "" : `Para enviar: ${missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(", ")} e ${missing.at(-1)}`}.`;

  // Free every local preview when the form goes away.
  const urls = useRef(new Set<string>());
  useEffect(() => {
    const all = urls.current;
    return () => all.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function pick(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (!picked.length) return;
    setShots((cur) => {
      const room = MAX_PHOTOS - cur.length;
      if (picked.length > room) setError(`Até ${MAX_PHOTOS} fotos por prova: usamos as ${room} primeiras.`);
      else setError("");
      return [
        ...cur,
        ...picked.slice(0, Math.max(0, room)).map((file) => {
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          // Read when the photo was taken (EXIF or file date) in the background.
          photoTakenAt(file).then((takenAt) => setShots((now) => now.map((s) => (s.url === url ? { ...s, takenAt } : s))));
          return { file, url };
        }),
      ];
    });
  }

  function remove(n: number) {
    setShots((cur) => {
      URL.revokeObjectURL(cur[n].url);
      urls.current.delete(cur[n].url);
      return cur.filter((_, i) => i !== n);
    });
    setError("");
  }

  async function pickAttachment(file: File | undefined) {
    if (!file) return;
    const kind = goal === "study" ? "study_pdf" : goal === "project" ? "project_zip" : null;
    if (!kind) return;
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const validation = validateAttachment(kind, file.name, file.size, header);
    if (!validation.ok) {
      setError(validation.reason === "size" ? attachmentCopy.tooBig : attachmentCopy.wrongType(kind));
      setAttachment(null);
      return;
    }
    setError("");
    setAttachment(file);
  }

  async function submit() {
    if (!shots.length || !ready) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const media = supabase.storage.from("media");
      const paths = shots.map(() => mediaPath(groupId, userId, goal));
      const { photos: blobs, thumb } = await compressProofPhotos(shots.map((s) => s.file));
      // The thumbnail only speeds up lists; if it fails, lists fall back to the full photo.
      const [ups] = await Promise.all([
        Promise.all(paths.map((p, n) => media.upload(p, blobs[n], { contentType: "image/jpeg", upsert: false }))),
        media.upload(thumbPath(paths[0]), thumb, { contentType: "image/jpeg", upsert: false }).catch(() => null),
      ]);
      if (ups.some((u) => u.error)) throw new Error(`${shots.length > 1 ? "Uma das fotos" : "A foto"} não subiu. Seus dados continuam aqui: tente de novo.`);
      const [path, ...extraPhotos] = paths;
      let savedCheckinId: string | null = null;
      const dates = (await Promise.all(shots.map((s) => (s.takenAt !== undefined ? s.takenAt : photoTakenAt(s.file))))).filter((d): d is Date => !!d);
      const oldest = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
      // The database sets the day (São Paulo) and the owner; the client only sends the content.
      const { data: inserted, error } = await supabase
        .from("checkins")
        .insert({
          goal,
          photo_path: path,
          summary: goal === "study" && !extra ? summary.trim() : null,
          ...(question ? { study_prompt: question.id } : {}),
          minutes: goal === "study" ? Number(minutes) : null,
          pages: goal === "reading" ? Number(pages) : null,
          title: goal === "project" ? title.trim() : null,
          ...(goal === "project" ? { project_url: normalizedProjectUrl } : {}),
          ...(extra ? { extra: true } : {}),
          ...(extraPhotos.length ? { extra_photos: extraPhotos } : {}),
          ...(oldest ? { photo_taken_at: oldest.toISOString() } : {}),
        }).select("id").single();
      if (!error) savedCheckinId = inserted?.id ?? null;
      // Already sent (the first send went through but its answer never arrived, or this page is
      // older than the proof): show the proof instead of an error.
      if (error?.code === "23505" && goal !== "project" && !extra) {
        setBusy(false);
        router.refresh();
        onDone?.();
        return;
      }
      // The proof may be saved even though its answer never arrived (the phone switched networks or
      // left the app mid-request): the photo path is unique to this send, so look for it first.
      let recovered = false;
      if (error && !["23505", "P0001"].includes(error.code)) {
        const { data: saved } = await supabase.from("checkins").select("id").eq("photo_path", path).maybeSingle();
        if (saved) {
          savedCheckinId = saved.id;
          recovered = true;
        }
      }
      if (error && !recovered) {
        throw new Error(
          error.code === "23505"
            ? goal === "project"
              ? "Você já registrou um projeto hoje."
              : "Essa meta já foi enviada hoje."
            : error.message.includes("photo not uploaded")
              ? "A foto não terminou de subir. Tente de novo."
              : error.message.includes("too many extra sessions")
                ? `Limite de ${MAX_EXTRA_SESSIONS} sessões extras por dia.`
                : error.message.includes("study proof first")
                  ? "A prova de estudo de hoje precisa estar valendo para somar sessões."
                  : // The code tells a dropped connection ("rede") from a server refusal in a friend's screenshot.
                    `Não foi possível enviar (código ${error.code || "rede"}). Seus dados continuam aqui: tente de novo.`,
        );
      }
      if (attachment && savedCheckinId) {
        const form = new FormData();
        form.set("file", attachment);
        const response = await fetch(`/api/checkins/${savedCheckinId}/attachments`, { method: "POST", body: form });
        if (!response.ok && response.status !== 409) throw new Error("A prova foi salva, mas não foi possível enviar o arquivo. Tente novamente na página da prova.");
      }
      // The AI judge is called by <PendingReviews> once the page shows the new proof.
      // The server may nudge the group (this person closed the day / weekly challenge done).
      fetch("/api/progress", { method: "POST", keepalive: true }).catch(() => {});
      justSent = extra ? "extra" : goal;
      onDone?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  // A photo the phone dates before today: told before sending, shown to the group after.
  const oldestPicked = shots.map((s) => s.takenAt?.toISOString()).filter((d): d is string => !!d).sort()[0];
  const staleNote = photoAgeLabel(oldestPicked, spToday());

  const fieldId = (name: string) => `${goal}-${mode}-${name}`;

  return (
    <section
      className={`card ${mode === "retake" ? "!border-warn" : ""}`}
      data-goal={goal}
      data-state={mode === "first" ? "pending" : mode}
      aria-labelledby={fieldId("title")}
      onChange={() => setTouched(true)}
    >
      <div className="mb-3 flex items-center gap-3">
        {mode === "retake" ? <RotateCcw size={24} aria-hidden className="shrink-0 text-warn" /> : <Sprite name={GOAL_SPRITE[goal]} dim />}
        <div className="min-w-0 flex-1">
          <h3 id={fieldId("title")} className="pixel text-xl uppercase leading-6">
            {mode === "retake" ? `Refazer ${g.label.toLowerCase()}` : extra ? "Sessão extra" : g.label}
          </h3>
          <p className="text-sm text-muted">
            {mode === "retake"
              ? "O grupo condenou a prova. Mande uma nova até 23:59 e a meta volta a valer."
              : extra
                ? `Mínimo ${MIN_EXTRA_MINUTES} min. Soma minutos no ranking.`
                : g.hint}
          </p>
        </div>
      </div>

      {goal === "project" && (
        <div className="mb-3 space-y-2">
          <label className="label" htmlFor={fieldId("name")}>
            Nome do projeto
          </label>
          <input
            id={fieldId("name")}
            className="input"
            placeholder="Ex.: calculadora em Python"
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="title"
          />
          <label className="label" htmlFor={fieldId("github")}>
            Repositório no GitHub
          </label>
          <p id={fieldId("github-help")} className="text-sm leading-5 text-muted">
            Cole o link do repositório deste projeto.
          </p>
          <input
            id={fieldId("github")}
            type="url"
            inputMode="url"
            className="input"
            placeholder="https://github.com/usuario/projeto"
            value={projectUrl}
            onChange={(e) => setProjectUrl(e.target.value)}
            aria-invalid={!!projectUrl.trim() && !normalizedProjectUrl}
            aria-describedby={`${fieldId("github-help")}${projectUrl.trim() && !normalizedProjectUrl ? ` ${fieldId("github-error")}` : ""}`}
            data-testid="project-url"
          />
          {projectUrl.trim() && !normalizedProjectUrl && (
            <p id={fieldId("github-error")} className="text-sm leading-5 text-warn">
              Use um link de repositório do GitHub, como https://github.com/usuario/projeto.
            </p>
          )}
        </div>
      )}

      {(goal === "study" || goal === "project") && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold leading-5">{attachmentCopy.title(goal === "study" ? "study_pdf" : "project_zip")} (opcional)</p>
          <p id={fieldId("attach-help")} className="text-sm leading-5 text-muted">
            {attachmentCopy.help(goal === "study" ? "study_pdf" : "project_zip")}
          </p>
          <div className="flex min-h-14 items-center gap-3 rounded-sm border-2 border-dashed border-control bg-bg px-3 text-sm text-muted hover:text-fg">
            <label className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3">
              <Plus size={18} aria-hidden />
              <span className="min-w-0 flex-1 break-all">
                {attachment ? (
                  <>
                    <span className="text-fg">{attachment.name}</span>
                    <span className="block">
                      Arquivo selecionado · {goal === "study" ? "PDF" : "ZIP"} · {attachmentSize(attachment.size)}
                    </span>
                  </>
                ) : (
                  attachmentCopy.add(goal === "study" ? "study_pdf" : "project_zip")
                )}
              </span>
              <input
                type="file"
                accept={goal === "study" ? ".pdf,application/pdf" : ".zip,application/zip,application/x-zip-compressed"}
                className="sr-only"
                aria-describedby={fieldId("attach-help")}
                data-testid="attachment-input"
                onChange={(e) => {
                  void pickAttachment(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {attachment && (
              <button type="button" className="min-h-11 shrink-0 underline" onClick={() => setAttachment(null)}>
                Remover arquivo
              </button>
            )}
          </div>
        </div>
      )}

      {/* No `capture` attribute: phones offer both camera and gallery. Several photos at once are fine. */}
      {shots.length === 0 ? (
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-sm border-2 border-dashed border-control bg-bg text-sm text-muted transition-colors duration-150 hover:text-fg">
          <span className="flex items-center gap-2 pt-8 font-medium">
            <Camera size={20} aria-hidden />
            Tirar ou escolher foto da prova
          </span>
          <span className="pb-8 pt-1 text-xs">Até {MAX_PHOTOS} fotos{goal === "reading" ? " (ex.: página inicial e final)" : ""}</span>
          <input type="file" accept="image/*" multiple className="sr-only" data-testid="proof-photo-input" onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
        </label>
      ) : (
        <ul className="grid grid-cols-2 gap-2" data-testid="photo-previews">
          {shots.map((s, n) => (
            <li key={s.url} className="relative">
              <img src={s.url} alt={`Prévia da foto ${n + 1}`} className="aspect-square w-full rounded-sm border-2 border-bevel-dark bg-bg object-cover" />
              <button
                type="button"
                onClick={() => remove(n)}
                aria-label={`Tirar a foto ${n + 1}`}
                className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-sm border-2 border-bevel-dark bg-bg/90 text-fg"
              >
                <X size={18} aria-hidden />
              </button>
            </li>
          ))}
          {shots.length < MAX_PHOTOS && (
            <li>
              <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-control bg-bg text-sm text-muted hover:text-fg">
                <Plus size={20} aria-hidden />
                Mais uma foto
                <span className="tabular text-xs">
                  {shots.length} de {MAX_PHOTOS}
                </span>
                <input type="file" accept="image/*" multiple className="sr-only" data-testid="proof-photo-input" onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
              </label>
            </li>
          )}
        </ul>
      )}
      {staleNote && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-warn" data-testid="photo-age-note">
          <Clock size={16} aria-hidden className="mt-0.5 shrink-0" />
          {staleNote}. Pode enviar, mas o grupo vai ver essa data.
        </p>
      )}

      {goal === "study" && (
        <div className="mt-3 space-y-3">
          <NumberField id={fieldId("minutes")} label={extra ? "Minutos nesta sessão" : "Minutos estudados"} min={minMinutes} max={1440} value={minutes} onChange={setMinutes} ok={minutesOk} testId="minutes" />
          {question && (
          <div data-testid="study-question" data-prompt={question.id}>
            <label className="label" htmlFor={fieldId("summary")}>
              Pergunta do dia
            </label>
            <p id={fieldId("question")} className="mb-2 break-words font-medium">
              {question.text}
            </p>
            <textarea
              id={fieldId("summary")}
              className="input min-h-24 resize-y"
              maxLength={2000}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              aria-describedby={`${fieldId("question")} ${fieldId("summary-help")}`}
            />
            <p id={fieldId("summary-help")} className={`tabular mt-1 text-sm ${summaryOk || !touched ? "text-muted" : "text-warn"}`}>
              {summary.trim().length} de {MIN_SUMMARY} caracteres mínimos
            </p>
          </div>
          )}
        </div>
      )}
      {goal === "reading" && (
        <div className="mt-3">
          <NumberField id={fieldId("pages")} label="Páginas lidas" min={1} max={2000} value={pages} onChange={setPages} ok={pagesOk} testId="pages" />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-fail">
          {error}
        </p>
      )}
      {missingText && (
        <p id={fieldId("missing")} className="mt-4 text-sm text-muted" aria-live="polite">
          {missingText}
        </p>
      )}
      <button
        className={`${goal === "project" ? "btn-secondary" : "btn-primary"} mt-3 w-full`}
        disabled={!ready || busy}
        onClick={submit}
        aria-describedby={missingText ? fieldId("missing") : undefined}
      >
        {busy && <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />}
        {busy ? "Enviando…" : goal === "project" ? "Registrar projeto" : extra ? "Somar sessão" : mode === "retake" ? "Enviar nova prova" : "Enviar prova"}
      </button>
    </section>
  );
}

function NumberField(props: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: string;
  onChange: (v: string) => void;
  ok: boolean;
  testId: string;
}) {
  const invalid = !props.ok && !!props.value;
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={props.id} className={`min-w-0 flex-1 break-words text-base leading-5 ${invalid ? "text-warn" : "text-fg"}`}>
        {props.label}
        <span className="block text-sm text-muted">Mínimo {props.min}</span>
      </label>
      <input
        id={props.id}
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        aria-invalid={invalid}
        className="input tabular w-24 shrink-0 text-right"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        data-testid={props.testId}
      />
    </div>
  );
}
