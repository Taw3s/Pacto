"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export const REACTIONS = [
  { kind: "respeito", label: "Respeito" },
  { kind: "monstro", label: "Monstro" },
  { kind: "lenda", label: "Lenda" },
] as const;
export type ReactionKind = (typeof REACTIONS)[number]["kind"];

interface Props {
  checkinId: string;
  /** Who stamped what (names, for the group to see). */
  initial: { kind: ReactionKind; name: string; mine: boolean }[];
  /** false on your own proof: you see the stamps but cannot stamp yourself. */
  canReact: boolean;
}

// Double border with cut corners: a rubber stamp, drawn in CSS so the label stays real text.
const CUT = "[clip-path:polygon(6px_0,calc(100%-6px)_0,100%_6px,100%_calc(100%-6px),calc(100%-6px)_100%,6px_100%,0_calc(100%-6px),0_6px)]";

/**
 * Friends' stamps on a proof: social recognition, not a validation (no green, no "verified").
 * Positive only: suspicion goes to the tribunal. A stamp changes only after the server confirms.
 */
export function ReactionBar({ checkinId, initial, canReact }: Props) {
  const [mine, setMine] = useState(() => new Set(initial.filter((r) => r.mine).map((r) => r.kind)));
  const [busy, setBusy] = useState<ReactionKind | null>(null);
  const [landed, setLanded] = useState<ReactionKind | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showNames, setShowNames] = useState(false);
  const others = (kind: ReactionKind) => initial.filter((r) => r.kind === kind && !r.mine).map((r) => r.name);
  const namesOf = (kind: ReactionKind) => [...others(kind), ...(mine.has(kind) ? ["você"] : [])];
  const total = REACTIONS.reduce((n, { kind }) => n + namesOf(kind).length, 0);

  async function toggle(kind: ReactionKind, label: string) {
    if (!canReact || busy) return;
    const on = !mine.has(kind);
    setBusy(kind);
    setError("");
    setStatus(on ? `Carimbando ${label}…` : `Retirando ${label}…`);
    const table = createClient().from("checkin_reactions");
    const { error } = on
      ? await table.insert({ checkin_id: checkinId, kind })
      : // RLS only lets anyone delete their own stamps.
        await table.delete().eq("checkin_id", checkinId).eq("kind", kind);
    if (error && !(on && error.code === "23505")) {
      setStatus("");
      setError(`Não foi possível ${on ? "carimbar" : "retirar o carimbo"}. Os carimbos do grupo continuam como estavam; tente de novo.`);
    } else {
      setMine((m) => new Set(on ? [...m, kind] : [...m].filter((k) => k !== kind)));
      setLanded(on ? kind : null);
      setStatus(on ? `Carimbo ${label} aplicado.` : `Carimbo ${label} retirado.`);
    }
    setBusy(null);
  }

  return (
    <section aria-labelledby="carimbos" className="mb-4" data-testid="reactions">
      <h2 id="carimbos" className="pixel mb-2 text-lg uppercase leading-6">
        Carimbos do grupo
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {REACTIONS.map(({ kind, label }) => {
          const count = namesOf(kind).length;
          const pressed = mine.has(kind);
          return (
            <button
              key={kind}
              type="button"
              // Not disabled while sending (focus stays on the button); toggle ignores repeated taps.
              disabled={!canReact}
              aria-busy={busy === kind}
              aria-pressed={canReact ? pressed : undefined}
              onClick={() => toggle(kind, label)}
              data-reaction={kind}
              className={`flex min-h-16 min-w-0 items-center justify-center rounded-sm border-2 p-1.5 shadow-[2px_2px_0_var(--color-hard-shadow)] disabled:cursor-default ${
                pressed ? "border-accent bg-raised" : "border-control bg-bg"
              }`}
            >
              <span
                className={`${CUT} flex w-full -rotate-2 flex-col items-center border-4 border-double px-1 py-1 ${pressed ? "border-accent text-accent" : "border-control text-fg"} ${
                  landed === kind ? "animate-[seal-in_210ms_steps(3)_both] motion-reduce:animate-none" : ""
                }`}
              >
                <span className="pixel flex items-center gap-1 text-sm uppercase leading-4">
                  {pressed && <Check size={14} strokeWidth={3} aria-hidden />}
                  {label}
                </span>
                <span className="tabular text-sm">{count}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p role="status" className="sr-only">
        {status}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-fail">
          {error}
        </p>
      )}
      {total > 0 && (
        <>
          <button
            type="button"
            className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-1 text-sm font-semibold text-muted hover:text-fg"
            aria-expanded={showNames}
            aria-controls="carimbos-nomes"
            onClick={() => setShowNames((v) => !v)}
          >
            Ver quem carimbou · {total}
            <ChevronDown size={16} aria-hidden className={showNames ? "rotate-180" : ""} />
          </button>
          {showNames && (
            <dl id="carimbos-nomes" className="mt-1 space-y-1 text-sm" data-testid="stamp-names">
              {REACTIONS.map(({ kind, label }) => {
                const names = namesOf(kind);
                return names.length ? (
                  <div key={kind}>
                    <dt className="inline font-semibold">{label}: </dt>
                    <dd className="inline">{names.join(", ")}</dd>
                  </div>
                ) : null;
              })}
            </dl>
          )}
        </>
      )}
      {!canReact && <p className="mt-1 text-sm text-muted">Os amigos carimbam a sua prova; você vê quem carimbou.</p>}
    </section>
  );
}
