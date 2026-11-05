"use client";

import { useState } from "react";
import type { JudgeAction } from "@/lib/judge";
import { IMPACT_EVENT } from "../GavelStamp";
import { JudgeAnim } from "../JudgeAnim";
import { Sprite } from "../Sprite";

/**
 * The judge behind the bench. On the gavel's impact the bench jolts (and a stamp listening to the key lands).
 * `still` keeps the resting frame (a closed session is not replayed); `onPlay` tells the scene the entrance started.
 */
export function BenchJudge({ action, playKey, still, onPlay }: { action: JudgeAction; playKey?: string; still?: boolean; onPlay?: () => void }) {
  const [hits, setHits] = useState(0);
  return (
    <div className="relative -mt-1 h-[144px] w-[144px]">
      <JudgeAnim
        action={action}
        playKey={playKey}
        still={still}
        onPlay={onPlay}
        className="absolute left-1/2 top-[10px] -translate-x-1/2"
        onImpact={() => {
          setHits((n) => n + 1);
          if (playKey) window.dispatchEvent(new CustomEvent(IMPACT_EVENT, { detail: playKey }));
        }}
      />
      <div key={hits} className={`absolute bottom-0 left-0 ${hits ? "animate-[thud_180ms_steps(3)] motion-reduce:animate-none" : ""}`}>
        <Sprite name="benchFront" scale={3} />
      </div>
    </div>
  );
}
