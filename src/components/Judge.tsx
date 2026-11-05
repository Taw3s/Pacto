import type { JudgeAction } from "@/lib/judge";
import { JudgeAnim } from "./JudgeAnim";

/**
 * The judge with a short speech bubble. The lines are fixed per state: the judge only points
 * out suspicions; decisions always come from the group's vote.
 */
export function Judge({ action, line, playKey, still, scale = 2, className = "" }: { action: JudgeAction; line?: string; playKey?: string; still?: boolean; scale?: 1 | 2 | 3; className?: string }) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <JudgeAnim action={action} playKey={playKey} still={still} scale={scale} />
      {line && <JudgeBubble>{line}</JudgeBubble>}
    </div>
  );
}

const TAIL = {
  // pointing left, at a judge beside the bubble
  left: "before:-left-[8px] before:bottom-2 before:border-y-[6px] before:border-r-[8px] before:border-y-transparent before:border-r-bevel-dark after:-left-[5px] after:bottom-[10px] after:border-y-[4px] after:border-r-[6px] after:border-y-transparent after:border-r-fg",
  // pointing up, at a judge above the bubble
  up: "before:-top-[8px] before:left-1/2 before:-ml-[6px] before:border-x-[6px] before:border-b-[8px] before:border-x-transparent before:border-b-bevel-dark after:-top-[5px] after:left-1/2 after:-ml-[4px] after:border-x-[4px] after:border-b-[6px] after:border-x-transparent after:border-b-fg",
};

export function JudgeBubble({ children, tail = "left", className = "" }: { children: React.ReactNode; tail?: keyof typeof TAIL; className?: string }) {
  return (
    <p
      className={`relative rounded-sm border-2 border-bevel-dark bg-fg px-2.5 py-1.5 text-sm font-semibold leading-5 text-bg shadow-[3px_3px_0_var(--color-hard-shadow)] before:absolute after:absolute ${tail === "left" ? "mb-6" : ""} ${TAIL[tail]} ${className}`}
    >
      {children}
    </p>
  );
}
