"use client";

import { Check, Minus, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../Avatar";

export interface Seat {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** true = annul, false = keep, null = has not voted. */
  upheld: boolean | null;
  reason: string | null;
}

const RING = { guilty: "ring-fail", innocent: "ring-done", none: "ring-control/50" };

/** The jury bench: who voted what; a juror who voted opens their reason. */
export function JuryBench({ seats, more }: { seats: Seat[]; more: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = seats.find((s) => s.id === open);
  return (
    <>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-3">
        {seats.map((s) => {
          const state = s.upheld === null ? "none" : s.upheld ? "guilty" : "innocent";
          const Icon = state === "guilty" ? X : state === "innocent" ? Check : Minus;
          const word = state === "guilty" ? "anular a prova" : state === "innocent" ? "manter a prova" : "ainda não votou";
          const face = (
            <>
              <span className="relative block">
                <span className={`block rounded-full ring-2 ring-offset-2 ring-offset-surface ${RING[state]} ${state === "none" ? "opacity-60" : ""}`}>
                  <Avatar name={s.name} url={s.avatarUrl} size={40} />
                </span>
                <span
                  aria-hidden
                  className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-sm border-2 ${
                    state === "guilty" ? "border-fail bg-fail-bg text-fail" : state === "innocent" ? "border-done bg-done-bg text-done" : "border-divider bg-raised text-muted"
                  }`}
                >
                  <Icon size={12} strokeWidth={3} />
                </span>
              </span>
              <span className="mt-1.5 block w-full hyphens-auto break-words text-center text-xs leading-4">{s.name}</span>
            </>
          );
          return (
            <li key={s.id} className="w-16" data-juror={s.name} data-vote={state}>
              {state === "none" ? (
                <div className="flex min-h-11 flex-col items-center">
                  {face}
                  <span className="sr-only">{word}</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex min-h-11 w-full flex-col items-center rounded-sm"
                  aria-expanded={open === s.id}
                  aria-controls="jury-reason"
                  aria-label={`${s.name}: ${word}. Ver o motivo`}
                  onClick={() => setOpen((o) => (o === s.id ? null : s.id))}
                >
                  {face}
                </button>
              )}
            </li>
          );
        })}
        {more > 0 && (
          <li className="flex w-16 flex-col items-center">
            <span className="pixel tabular flex h-10 w-10 items-center justify-center rounded-full bg-raised text-base">+{more}</span>
            <span className="mt-1.5 text-center text-xs text-muted">na aba Votos</span>
          </li>
        )}
      </ul>
      <div id="jury-reason" aria-live="polite">
        {shown && (
          <p className="mt-3 rounded-sm border-2 border-bevel-dark bg-bg px-3 py-2 text-sm" data-testid="jury-reason">
            <b>{shown.name}</b> votou{" "}
            <b className={shown.upheld ? "text-fail" : "text-done"}>{shown.upheld ? "anular a prova" : "manter a prova"}</b>:{" "}
            {shown.reason ?? <span className="text-muted">sem motivo (voto antigo).</span>}
          </p>
        )}
      </div>
    </>
  );
}
