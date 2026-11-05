"use client";

import { ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GUIDE } from "@/lib/guide";
import { JudgeBubble } from "./Judge";
import { JudgeAnim } from "./JudgeAnim";

const OPEN_GUIDE = "pacto:open-guide";

/** Opens the guide from anywhere (e.g. "Ver regras e folga"), optionally on one answer; focus returns to `opener`. */
export function openGuide(opener: HTMLElement, entry?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_GUIDE, { detail: { opener, entry } }));
}

/**
 * Opens the judge's guide. An action, not a destination: on phones it sits in the page header
 * (next to "Voltar" on pages that have it), on desktop at the end of the side bar.
 */
export function GuideButton({ place }: { place: "header" | "nav" }) {
  return (
    <button
      type="button"
      onClick={(e) => window.dispatchEvent(new CustomEvent(OPEN_GUIDE, { detail: e.currentTarget }))}
      aria-haspopup="dialog"
      data-testid={place === "header" ? "judge-guide" : "judge-guide-nav"}
      className={
        place === "header"
          ? "btn-secondary min-h-12 min-w-20 shrink-0 !gap-1.5 !px-3 !font-sans !text-sm !normal-case desk:hidden"
          : "flex min-h-12 w-full items-center gap-3 rounded-sm border-2 border-transparent px-4 text-left text-base font-semibold text-muted hover:text-fg"
      }
    >
      <HelpCircle size={18} aria-hidden className="text-accent" />
      {place === "header" ? "Juiz" : "Guia do juiz"}
    </button>
  );
}

/**
 * "Pergunte ao juiz": fixed questions and answers about the rules, opened by a GuideButton. No AI
 * call: the answers are written from the code, so they are always right. The native modal keeps
 * focus inside and closes on Escape; focus goes back to the button that opened it.
 */
export function JudgeGuide() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const entry = GUIDE.find((g) => g.id === open);

  useEffect(() => {
    const show = (e: Event) => {
      const detail = (e as CustomEvent<HTMLElement | { opener: HTMLElement; entry?: string }>).detail;
      const target = detail instanceof HTMLElement ? { opener: detail, entry: undefined } : detail;
      opener.current = target?.opener ?? null;
      setOpen(target?.entry ?? null);
      dialog.current?.showModal();
    };
    window.addEventListener(OPEN_GUIDE, show);
    return () => window.removeEventListener(OPEN_GUIDE, show);
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="guide-title"
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-sm border-2 border-bevel-dark bg-surface p-0 text-fg shadow-[4px_4px_0_var(--color-hard-shadow)] backdrop:bg-black/70 open:flex"
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
      onClose={() => opener.current?.focus()}
    >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-divider px-4 py-2">
          <h2 id="guide-title" className="pixel text-xl uppercase leading-6">
            Pergunte ao juiz
          </h2>
          <button type="button" autoFocus className="btn-secondary min-h-12 min-w-12 !px-2" aria-label="Fechar" onClick={() => dialog.current?.close()}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4 pt-3">
          <div className="flex items-end gap-2">
            <JudgeAnim action={entry ? "stamp" : "idle"} still={!!entry} />
            <JudgeBubble>{entry ? entry.q : "Sou o juiz do Pacto. Sobre o que você quer saber?"}</JudgeBubble>
          </div>
          {entry ? (
            <div className="mt-2" data-testid="guide-answer">
              <div className="space-y-2">
                {entry.a.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <button type="button" className="btn-secondary mt-4 w-full" onClick={() => setOpen(null)}>
                <ChevronLeft size={18} aria-hidden /> Outras perguntas
              </button>
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {GUIDE.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(g.id)}
                    className="flex min-h-12 w-full items-center justify-between gap-2 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-left font-medium hover:bg-raised"
                  >
                    {g.q}
                    <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Respostas fixas, escritas a partir das regras do app. O juiz não decide nada: quem decide é o grupo.</p>
          {/* Brings back the "Primeiros passos" card on Hoje after it was closed. */}
          <a href="/hoje?primeiros=1" className="mt-2 inline-flex min-h-12 items-center text-sm font-semibold text-accent underline" data-testid="reopen-first-steps">
            Rever primeiros passos
          </a>
        </div>
    </dialog>
  );
}
