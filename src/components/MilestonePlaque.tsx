"use client";

import { useEffect, useState } from "react";
import { Sprite } from "./Sprite";

/**
 * Streak milestone plaque ("7 DIAS SEGUIDOS"). A visual mark only: no points, no rule change.
 * Stamps in once per viewer + person + milestone; static afterwards and with reduced motion.
 */
export function MilestonePlaque({ milestone, viewerId, personId }: { milestone: number; viewerId: string; personId: string }) {
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const key = `pacto:stamp:streak:${viewerId}:${personId}:${milestone}`;
    try {
      if (localStorage.getItem(key) === "1") return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlay(true);
  }, [milestone, viewerId, personId]);

  return (
    <div className="card mb-4 flex items-center gap-3 !border-gold !bg-warn-bg" data-testid="milestone" role="status">
      <Sprite name="trophy" />
      <div>
        {/* A milestone the current streak has passed, not the streak itself (shown in its own card). */}
        <p className="text-xs leading-4 text-fg">Marco alcançado</p>
        <p className={`pixel text-2xl font-bold uppercase leading-7 text-gold ${play ? "animate-[stamp_260ms_steps(4)_both]" : ""}`}>
          {milestone} dias seguidos
        </p>
      </div>
    </div>
  );
}
