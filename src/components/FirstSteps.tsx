"use client";

import { Check, ChevronDown, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openGuide } from "@/components/JudgeGuide";
import { Sprite } from "@/components/Sprite";
import { formatDayPt } from "@/lib/dates";
import { menuPhrase, type DebtItem } from "@/lib/debt-items";
import { inviteUrl } from "@/lib/invite";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  groupId: string;
  inviteCode: string;
  menuToday: DebtItem[];
  menuNext: { from: string; items: DebtItem[] } | null;
  /** From the server: a proof of study, typing or reading exists (the optional project does not count). */
  firstProof: boolean;
  alone: boolean;
  /** Opened from the guide ("Rever primeiros passos"): show it again even if it was closed. */
  reopen: boolean;
  /** From the server (0029): this person has not seen the welcome in this group yet, on any device. */
  welcome: boolean;
  groupName: string;
}

/** What this device remembers, per person and group (a new group starts over; nothing is sent anywhere). */
interface Saved {
  copied?: boolean;
  understood?: boolean;
  later?: boolean;
  closed?: boolean;
}

// Memory fallback when localStorage is blocked (private mode, storage full): the card still works.
const memory = new Map<string, Saved>();

function load(key: string): Saved {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {}
  return memory.get(key) ?? {};
}

function save(key: string, value: Saved) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

type StepId = "invite" | "rules" | "proof";

/**
 * "Seu grupo começa aqui": a dismissible card on Hoje, not a tutorial. Three steps (invite, the deal,
 * the first proof); only the open one shows its details. Copying the link is "Link copiado", never
 * "amigos convidados": copying proves neither sending nor joining. The first proof comes from the server.
 */
export function FirstSteps({ userId, groupId, inviteCode, menuToday, menuNext, firstProof, alone, reopen, welcome, groupName }: Props) {
  const key = `pacto:first-steps:${userId}:${groupId}`;
  const [saved, setSaved] = useState<Saved | null>(null);
  const [open, setOpen] = useState<StepId | null>(null);
  const [link, setLink] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [feedback, setFeedback] = useState("");
  const linkField = useRef<HTMLTextAreaElement>(null);
  // The welcome shows once per person and group (Q1 = C): marked as seen on the server as soon as it is shown,
  // so another device or a reload does not show it again. Failing to mark only means it may show once more.
  const [welcomeOpen, setWelcomeOpen] = useState(welcome);
  const marked = useRef(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Where focus goes after the card changes shape, so it is never dropped on <body>.
  const focusAfter = useRef<"toggle" | "heading" | "page" | null>(null);
  useEffect(() => {
    const target = focusAfter.current;
    focusAfter.current = null;
    if (target === "toggle") toggle.current?.focus();
    else if (target === "heading") heading.current?.focus();
    else if (target === "page") {
      const h1 = document.querySelector<HTMLElement>("main h1");
      h1?.setAttribute("tabindex", "-1");
      h1?.focus();
    }
  }, [saved]);

  useEffect(() => {
    let s = load(key);
    if (reopen) s = { ...s, later: false, closed: false };
    setSaved(s);
    setLink(inviteUrl(window.location.origin, inviteCode));
    setCanShare(typeof navigator.share === "function");
    // Start on the first step not done yet.
    setOpen(!s.copied ? "invite" : !s.understood ? "rules" : !firstProof ? "proof" : null);
  }, [key, reopen, inviteCode, firstProof]);

  // Mark only once the welcome is really on screen (a card closed or collapsed on this device does not show it).
  const welcomeShown = welcomeOpen && !!saved && !saved.closed && !saved.later;
  useEffect(() => {
    if (!welcomeShown || marked.current) return;
    marked.current = true;
    createClient().rpc("mark_welcome_seen").then(() => {}, () => {});
  }, [welcomeShown]);

  // Nothing until this device's state is known: no flash of a card that was already closed.
  if (!saved || saved.closed) return null;

  const update = (patch: Saved) => {
    const next = { ...saved, ...patch };
    setSaved(next);
    save(key, next);
  };
  const done = { invite: !!saved.copied, rules: !!saved.understood, proof: firstProof };
  const allDone = done.invite && done.rules && done.proof;

  if (saved.later) {
    return (
      <div className="mb-4">
        <button
          ref={toggle}
          type="button"
          className="btn-secondary min-h-12 w-full justify-between !font-sans !text-base !normal-case"
          aria-expanded={false}
          onClick={() => ((focusAfter.current = "heading"), update({ later: false }))}
          data-testid="first-steps-collapsed"
        >
          <span className="flex items-center gap-2">
            <Sprite name="evidenceFolder" className="-my-2" />
            Primeiros passos
          </span>
          <ChevronDown size={20} aria-hidden />
        </button>
      </div>
    );
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      update({ copied: true });
      setFeedback("Link copiado. Agora envie para seus amigos.");
    } catch {
      setFeedback("Não foi possível copiar. Selecione o link e copie manualmente.");
      linkField.current?.select();
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "Pacto", text: "Entre no meu desafio do Pacto:", url: link });
      // Sharing is not proof of delivery: it only counts as having the link in hand, like copying.
      update({ copied: true });
    } catch {
      // Cancelled or unavailable: not an error.
    }
  }

  function goToGoals() {
    const title = document.getElementById("metas");
    if (!title) return;
    title.setAttribute("tabindex", "-1");
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    title.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    title.focus({ preventScroll: true });
  }

  const steps: { id: StepId; title: string; doneLabel: string; body: React.ReactNode }[] = [
    {
      id: "invite",
      title: "Convide seus amigos",
      doneLabel: "Link copiado",
      body: (
        <>
          {alone && <p className="font-semibold">Por enquanto, só você está aqui. Compartilhe o convite para começar com os amigos.</p>}
          <p>Compartilhe o link do desafio. Quem entrar começa a dever a partir do dia seguinte.</p>
          <label className="label !mb-0" htmlFor="invite-link">
            Link do convite
          </label>
          <textarea
            ref={linkField}
            id="invite-link"
            readOnly
            rows={2}
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="input min-h-12 resize-none break-all font-mono text-sm"
            data-testid="invite-link"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary" onClick={copy} disabled={!link}>
              <Copy size={18} aria-hidden /> Copiar link
            </button>
            {canShare && (
              <button type="button" className="btn-secondary" onClick={share} disabled={!link}>
                <Share2 size={18} aria-hidden /> Compartilhar
              </button>
            )}
          </div>
          <p role="status" className="text-sm font-semibold">
            {feedback}
          </p>
          <p className="text-sm text-muted">
            Ou passe o código: <code className="pixel tabular text-base tracking-widest text-fg">{inviteCode}</code>
          </p>
          <p className="text-sm text-muted">Quem tiver este convite poderá entrar no grupo. Compartilhe com as pessoas que você quer convidar.</p>
        </>
      ),
    },
    {
      id: "rules",
      title: "Entenda o combinado",
      doneLabel: "Combinado entendido",
      body: (
        <>
          <p>Estudo com foto e resumo. Digitação no app. Leitura com foto. Envie tudo até 23:59, no horário de São Paulo.</p>
          <p>
            Cada dia não cumprido vale: <b data-testid="first-steps-menu">{menuPhrase(menuToday)}</b>.
          </p>
          {menuNext && (
            <p className="text-sm text-muted">
              A partir de {formatDayPt(menuNext.from)}: {menuPhrase(menuNext.items)}.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" className="btn-secondary" onClick={() => update({ understood: true })} disabled={done.rules}>
              {done.rules && <Check size={18} aria-hidden />}
              Entendi o combinado
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 items-center px-1 font-semibold text-accent underline"
              onClick={(e) => openGuide(e.currentTarget, "folga")}
              aria-haspopup="dialog"
            >
              Ver regras e folga
            </button>
          </div>
        </>
      ),
    },
    {
      id: "proof",
      title: "Envie sua primeira prova",
      doneLabel: "Primeira prova enviada.",
      body: done.proof ? (
        <p>Primeira prova enviada.</p>
      ) : (
        <>
          <p>Escolha uma das três metas abaixo para começar.</p>
          <button type="button" className="btn-secondary" onClick={goToGoals}>
            Ir para minhas metas
          </button>
        </>
      ),
    },
  ];

  return (
    <section aria-labelledby="first-steps-title" className="card doc-tab mb-4 space-y-3 !p-4" data-testid="first-steps">
      {welcomeOpen && (
        <div className="space-y-3 border-b-2 border-divider pb-4" data-testid="welcome">
          <div className="flex items-center gap-3">
            <Sprite name="judge-present6" scale={2} />
            <div className="min-w-0">
              <p className="pixel break-words text-2xl leading-7">Bem-vindo ao Pacto</p>
              <p className="break-words text-base leading-6 text-muted">{groupName}</p>
            </div>
          </div>
          <p>O combinado começa com uma prova. Escolha uma meta para começar.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary" onClick={() => (setWelcomeOpen(false), goToGoals())}>
              Ir para as metas
            </button>
            <button type="button" className="btn-secondary" onClick={() => ((focusAfter.current = "heading"), setWelcomeOpen(false), setSaved({ ...saved }))}>
              Pular apresentação
            </button>
          </div>
        </div>
      )}
      <div className="flex items-start gap-3">
        <Sprite name="evidenceFolder" />
        <div className="min-w-0">
          <h2 id="first-steps-title" ref={heading} tabIndex={-1} className="pixel break-words text-xl leading-6">
            Seu grupo começa aqui
          </h2>
          <p className="mt-1 text-sm">Convide a turma, conheça as metas e envie sua primeira prova.</p>
        </div>
      </div>

      <ol className="divide-y-2 divide-divider border-y-2 border-divider">
        {steps.map((s, i) => {
          const isOpen = open === s.id;
          const panel = `first-step-${s.id}`;
          return (
            <li key={s.id} data-step={s.id} data-done={done[s.id]}>
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : s.id)}
              >
                <span
                  aria-hidden
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 text-lg font-bold ${
                    done[s.id] ? "border-done bg-done-bg text-done" : "border-bevel-light bg-raised"
                  }`}
                >
                  {done[s.id] ? <Check size={18} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="pixel block break-words text-xl leading-6">{s.title}</span>
                  <span className={`block text-sm ${done[s.id] ? "text-done" : "text-muted"}`}>{done[s.id] ? s.doneLabel : "A fazer"}</span>
                </span>
                <ChevronDown size={20} aria-hidden className={`shrink-0 text-muted ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <div id={panel} hidden={!isOpen} className="space-y-3 pb-4 text-sm leading-5">
                {s.body}
              </div>
            </li>
          );
        })}
      </ol>

      {allDone ? (
        <div className="space-y-2">
          <p className="font-semibold">Tudo pronto para começar. Agora é manter o pacto.</p>
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => ((focusAfter.current = "page"), update({ closed: true }))}>
            Fechar primeiros passos
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Quer um lembrete no celular?{" "}
            <a href="/config#avisos" className="inline-flex min-h-12 items-center font-semibold text-accent underline">
              Configurar avisos
            </a>
          </p>
          <button type="button" className="btn-secondary min-h-12" onClick={() => ((focusAfter.current = "toggle"), update({ later: true }))}>
            Continuar depois
          </button>
        </div>
      )}
    </section>
  );
}
