"use client";

import { AlertTriangle, Check, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { msUntilEndOfDay } from "@/lib/dates";
import { GOALS, type DailyGoal } from "@/lib/types";
import { Sprite, type SpriteName } from "./Sprite";
import { VerifiedSeal } from "./VerifiedSeal";

export type GoalState = "done" | "pending" | "annulled";

/** The official streak (lib/ledger.ts currentStreak), computed by the page. */
export interface StreakInfo {
  days: number;
  /** Ever completed a day: zero then reads "Um novo começo" instead of "primeiro dia". */
  hasHistory: boolean;
  /** Set on the day the streak reaches a milestone (lib/ledger.ts STREAK_MILESTONES). */
  milestone: number | null;
  userId: string;
}

interface Props {
  isOff: boolean;
  streak: StreakInfo;
  states: Record<DailyGoal, GoalState>;
  /** Set when the AI judge confirmed all 3 proofs today (shows the "Verificado!" seal). */
  verified?: { day: string; userId: string } | null;
}

function remaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

function missingPhrase(missing: string[]) {
  const names = missing.map((m) => m.toLowerCase());
  if (names.length === 3) return "Faltam as 3 metas";
  if (names.length === 2) return `Faltam ${names[0]} e ${names[1]}`;
  return `Falta ${names[0]}`;
}

const WORD: Record<GoalState, string> = { done: "Feita", pending: "Pendente", annulled: "Anulada" };

// The prop's pose follows the confirmed state (Astra brief of 04/11, "mesa de trabalho"): the notebook's page curls up and
// the book lies open while the goal is pending; done, the page lies flat and the book is closed. The keyboard keeps one pose.
// An annulled goal is open again: it takes the pending pose, never a torn or burnt prop; "Anulada" and the mark tell it.
const POSE: Record<DailyGoal, Record<"pending" | "done", SpriteName>> = {
  study: { pending: "notebookPending", done: "notebookDone" },
  typing: { pending: "keyboard", done: "keyboard" },
  reading: { pending: "bookPending", done: "bookDone" },
};

/** The desk: one low-poly prop per goal on a wooden top, posed by the goal's state. */
function Shelf({ states }: { states: Record<DailyGoal, GoalState> }) {
  return (
    <div className="@container">
      {/* 96 px from a 240 px desk (the sprites' transparent margins may overlap, the props do not), else 48 px: never an in-between scale */}
      <ul className="relative z-10 -mb-2 grid grid-cols-3 gap-1.5" aria-label="Metas do dia">
        {GOALS.map((g) => {
          const s = states[g.id];
          return (
            <li key={g.id} className="flex flex-col items-center" data-shelf={g.id} data-shelf-state={s}>
              <div className="relative">
                <Sprite
                  name={POSE[g.id][s === "done" ? "done" : "pending"]}
                  scale={2}
                  className={`h-12 w-12 @min-[240px]:h-24 @min-[240px]:w-24 ${s === "done" ? "" : "brightness-[0.92] saturate-[0.85]"}`}
                />
                {s !== "pending" && (
                  <span
                    aria-hidden
                    className={`absolute -right-2 top-1 flex h-6 w-6 items-center justify-center rounded-sm border-2 @min-[240px]:right-0 @min-[240px]:top-7 ${
                      s === "done" ? "border-done bg-done-bg text-done" : "border-fail bg-fail-bg text-fail"
                    }`}
                  >
                    {s === "done" ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {/* the desk: an 8 px top seen from above, then the front edge with the hard shadow */}
      <div aria-hidden className="shadow-[3px_3px_0_var(--color-hard-shadow)]">
        <div className="h-2 bg-wood" />
        <div className="h-2.5 rounded-b-[1px] border-b-4 border-wood-dark bg-wood-dark/70" />
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-1.5 text-center" aria-hidden>
        {GOALS.map((g) => (
          <li key={g.id}>
            <p className="pixel text-base uppercase leading-4">{g.label}</p>
            <p className={`text-xs ${states[g.id] === "done" ? "text-done" : states[g.id] === "annulled" ? "text-fail" : "text-muted"}`}>
              {WORD[states[g.id]]}
            </p>
          </li>
        ))}
      </ul>
      {/* the same information for screen readers, in one sentence */}
      <p className="sr-only">{GOALS.map((g) => `${g.label}: ${WORD[states[g.id]]}`).join(". ")}.</p>
    </div>
  );
}

/**
 * The streak as a calendar page: the value is the ledger's, never recounted here. Zero is a fresh
 * start, not a loss. A milestone shows a number plate that drops in once per person and milestone
 * (static with reduced motion, or when the verified seal is already celebrating).
 */
function StreakStrip({ streak, isOff, quiet }: { streak: StreakInfo; isOff: boolean; quiet: boolean }) {
  const [play, setPlay] = useState(false);
  const { days, milestone, userId } = streak;
  useEffect(() => {
    if (!milestone || quiet) return;
    const key = `pacto:streak-plate:${userId}:${milestone}`;
    try {
      if (localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlay(true);
  }, [milestone, userId, quiet]);

  const title = days > 0 ? (
    <>
      <span className="text-accent">{days}</span> {days === 1 ? "dia em sequência" : "dias em sequência"}
    </>
  ) : streak.hasHistory ? (
    "Um novo começo"
  ) : (
    "Seu primeiro dia começa aqui"
  );
  const line = isOff ? "Hoje é folga" : days > 0 ? "Seu ritmo, um dia de cada vez." : streak.hasHistory ? "Seu histórico continua guardado." : null;

  return (
    <div className="mt-4 flex min-h-[72px] items-center gap-3 rounded-sm border-2 border-divider bg-bg p-3" data-testid="streak-strip" data-streak={days}>
      <div className="relative shrink-0">
        <Sprite name="calendar" />
        {milestone && (
          <span
            className={`pixel tabular absolute -bottom-1 -right-2 rounded-sm border-2 border-bevel-dark bg-accent px-1 text-sm font-bold leading-4 text-on-accent ${
              play ? "animate-[plate-in_450ms_steps(3)_both]" : ""
            }`}
            data-testid="streak-plate"
          >
            {milestone}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="pixel text-xl uppercase leading-6">{title}</p>
        {milestone ? (
          <p className="text-sm text-muted">Marco de {milestone} dias alcançado.</p>
        ) : (
          line && <p className="text-sm text-muted">{line}</p>
        )}
      </div>
    </div>
  );
}

/** Answers "how much is left?" in one glance: count, next pending goal, deadline. */
export function Scoreboard({ isOff, states, verified, streak }: Props) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilEndOfDay());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const done = GOALS.filter((g) => states[g.id] === "done").length;
  const missing = GOALS.filter((g) => states[g.id] !== "done").map((g) => g.label);
  const complete = done === 3;

  if (isOff) {
    return (
      <section className="card mb-6" data-testid="scoreboard" data-scoreboard="off">
        {verified && <VerifiedSeal {...verified} />}
        <div className="flex items-center gap-3">
          <Sprite name="beachChair" scale={2} />
          <div>
            <p className="pixel text-[28px] uppercase leading-8 text-off">Folga</p>
            <p className="mt-1 font-semibold">Hoje é sua folga</p>
            <p className="mt-1 text-sm text-muted">Nada é obrigatório. Se quiser fazer as metas, elas continuam pontuando.</p>
          </div>
        </div>
        <StreakStrip streak={streak} isOff quiet={!!verified} />
      </section>
    );
  }

  const pendingDuty = !complete;
  const urgent = pendingDuty && ms !== null && ms <= 15 * 60_000;
  const soon = pendingDuty && ms !== null && ms <= 60 * 60_000;

  return (
    <section className="card mb-6" data-testid="scoreboard" data-scoreboard={complete ? "complete" : "pending"}>
      {verified && <VerifiedSeal {...verified} />}
      <div className="flex items-center gap-4">
        <p className={`pixel tabular text-[56px] font-bold leading-[56px] ${complete ? "text-done" : "text-accent"}`} data-testid="progress">
          {done}/3
        </p>
        <div className="min-w-0">
          <p className="pixel text-base uppercase text-muted">{complete ? "Dia cumprido" : "Metas cumpridas"}</p>
          <p className="text-lg font-semibold leading-6">{complete ? "Missão do dia completa" : missingPhrase(missing)}</p>
        </div>
      </div>

      <Shelf states={states} />
      <StreakStrip streak={streak} isOff={false} quiet={!!verified} />

      {ms !== null &&
        (complete ? (
          <p className="mt-4 text-sm text-muted">Prazo de hoje: 23:59 (horário de São Paulo).</p>
        ) : (
          <div className={`mt-4 border-t-2 border-divider pt-3 ${urgent ? "text-fail" : soon ? "text-warn" : "text-fg"}`}>
            <p className="pixel tabular flex items-center gap-2 text-xl uppercase" data-testid="deadline">
              {urgent ? <AlertTriangle size={20} aria-hidden /> : <Clock size={20} aria-hidden />}
              {urgent ? "Últimos minutos · " : ""}Encerra em {remaining(ms)}
            </p>
            <p className="mt-0.5 text-sm text-muted">Até 23:59, horário de São Paulo.</p>
          </div>
        ))}
    </section>
  );
}
