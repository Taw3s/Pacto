"use client";

import { BenchJudge } from "./BenchJudge";
import { SESSION_EVENT } from "./CourtCrowd";

/**
 * The judge at the bench (the crowd in front of it is CourtCrowd, in Courtroom). Open: one strike opens the session, once
 * per viewer and tribunal (`playKey`), and the crowd settles with it. Closed: the final pose, still; the decision is told by the text below the scene,
 * never re-enacted on a later visit.
 */
export function CourtBench({ open, playKey }: { open: boolean; playKey: string }) {
  return (
    // 16 px closer to the crest (Astra brief): the judge's highest frame still clears it by ~7 px
    <div className="relative -mt-4">
      <BenchJudge
        action={open ? "session" : "gavel"}
        playKey={open ? playKey : undefined}
        still={!open}
        // the crowd settles with the strike (CourtCrowd listens for this session's key)
        onPlay={() => window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: playKey }))}
      />
    </div>
  );
}
