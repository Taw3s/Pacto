"use client";

import { useEffect, useState } from "react";
import type { JudgeAction } from "@/lib/judge";
import { JudgeAnim } from "./JudgeAnim";

const TONE = {
  done: "border-done bg-done-bg text-done",
  fail: "border-fail bg-fail-bg text-fail",
} as const;

/** The bench judge announces impacts with this event, so a stamp elsewhere on the page lands with it. */
export const IMPACT_EVENT = "pacto:judge-impact";

interface Props {
  stamp: string;
  note: string;
  tone: keyof typeof TONE;
  /** The animation plays once per device for this key: include the viewer (user + day, user + dispute). */
  playKey: string;
  /** "stamp" for verifications, "gavel" for the jury's decision, "close" for a session closing in front of the voter. */
  action?: Extract<JudgeAction, "stamp" | "gavel" | "close">;
  /** false: the judge strikes but the stamp stays put (a verdict is never struck in: the gavel is not a conviction). */
  jolt?: boolean;
  /** false when another judge on the page (the courtroom bench) plays the strike. */
  showJudge?: boolean;
  testId?: string;
}

/**
 * A result stamp. The text (result and consequence) is visible from the start; only the art moves:
 * the judge strikes once and the stamp jolts on the impact frame.
 */
export function GavelStamp({ stamp, note, tone, playKey, action = "gavel", showJudge = true, jolt = true, testId }: Props) {
  const [hits, setHits] = useState(0);

  useEffect(() => {
    if (showJudge) return;
    const on = (e: Event) => (e as CustomEvent<string>).detail === playKey && setHits((n) => n + 1);
    window.addEventListener(IMPACT_EVENT, on);
    return () => window.removeEventListener(IMPACT_EVENT, on);
  }, [showJudge, playKey]);

  return (
    <div className="flex items-center gap-3" data-testid={testId} role="status">
      {showJudge && <JudgeAnim action={action} playKey={playKey} onImpact={jolt ? () => setHits((n) => n + 1) : undefined} />}
      <div className="min-w-0">
        <p
          key={hits}
          className={`pixel inline-block -rotate-6 rounded-sm border-[3px] px-3 py-1 text-2xl font-bold uppercase leading-7 shadow-[3px_3px_0_var(--color-hard-shadow)] ${TONE[tone]} ${
            hits ? "animate-[thud_180ms_steps(3)] motion-reduce:animate-none" : ""
          }`}
        >
          {stamp}
        </p>
        <p className="mt-4 text-sm text-muted">{note}</p>
      </div>
    </div>
  );
}
