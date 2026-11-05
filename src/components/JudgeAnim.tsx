"use client";

/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */
import { useEffect, useRef, useState } from "react";
import { JUDGE, judgeSrc, type JudgeAction } from "@/lib/judge";

interface Props {
  action: JudgeAction;
  scale?: 1 | 2 | 3;
  /**
   * One-shot actions play once per device for this key (include viewer, entity and event, e.g.
   * `verdict:<user>:<dispute>`); later visits show the still frame. Visual only, never a rule.
   */
  playKey?: string;
  /** Called on the impact frame (gavel or stamp hit), to sync the stamp and the bench. */
  onImpact?: () => void;
  /** Called when a one-shot really starts playing (not when it is skipped), to start other art in sync. */
  onPlay?: () => void;
  /** Always the still frame (e.g. "unavailable": nothing is happening). */
  still?: boolean;
  className?: string;
}

const reducedQuery = "(prefers-reduced-motion: reduce)";

function seen(key: string) {
  try {
    const k = `pacto:judge:${key}`;
    const was = localStorage.getItem(k) === "1";
    localStorage.setItem(k, "1");
    return was;
  } catch {
    return false;
  }
}

/** Preloads every frame so the animation never shows a missing image (gives up after 1.5 s). */
function preload(ids: string[]) {
  const all = ids.map(
    (id) =>
      new Promise<void>((done) => {
        const img = new Image();
        img.onload = img.onerror = () => done();
        img.src = judgeSrc(id);
      }),
  );
  return Promise.race([Promise.all(all), new Promise((r) => setTimeout(r, 1500))]);
}

/**
 * The judge, animated. Starts on the still frame (server render, reduced motion, already seen) and
 * plays only on the client: one clock (chained timeouts) per sequence, all cleared on unmount,
 * on action change, when the tab is hidden or the judge scrolls out of view, and when reduced
 * motion is turned on. Decorative: the state is always told by the text next to it.
 */
export function JudgeAnim({ action, scale = 2, playKey, onImpact, onPlay, still = false, className = "" }: Props) {
  const s = JUDGE[action];
  const [frame, setFrame] = useState(s.still);
  const ref = useRef<HTMLImageElement>(null);
  const impact = useRef(onImpact);
  impact.current = onImpact;
  const playing = useRef(onPlay);
  playing.current = onPlay;

  useEffect(() => {
    setFrame(s.still);
    if (still) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };
    const stop = () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
    const media = window.matchMedia(reducedQuery);
    let visible = true;
    let cancelled = false;
    let ready = false; // every frame preloaded
    // One-shot actions: a new key plays once; the key is spent even if the play is interrupted.
    const once = !s.loop && !s.every;
    const fresh = once && (!playKey || !seen(playKey));
    let played = !fresh;

    const canPlay = () => !cancelled && !media.matches && visible && !document.hidden;

    function play(i = 0) {
      if (!canPlay()) return;
      const f = s.frames[i];
      if (i === 0 && once) playing.current?.();
      setFrame(f.id);
      if (i === s.impact) impact.current?.();
      if (i < s.frames.length - 1) return later(() => play(i + 1), f.ms);
      // end of the sequence
      if (once) {
        played = true;
        return setFrame(s.still);
      }
      if (s.loop) return later(() => play(0), f.ms || 150);
      schedule();
    }
    function schedule() {
      if (!s.every) return;
      const [min, max] = s.every;
      later(() => play(0), min + Math.random() * (max - min));
    }
    function start() {
      stop();
      if (!ready) return;
      if (!canPlay()) {
        // Reduced motion or paused: show the resting frame (the end state for one-shots).
        setFrame(s.still);
        if (once && fresh && media.matches) {
          played = true;
          impact.current?.();
        }
        return;
      }
      if (once) return played ? setFrame(s.still) : play(0);
      if (s.loop) return play(0);
      setFrame(s.still);
      schedule();
    }

    setFrame(s.still);
    const asked = performance.now();
    preload(s.frames.map((f) => f.id)).then(() => {
      ready = true;
      // Too late for an entrance: the person is already reading or voting, so keep the still frame.
      if (once && !played && s.startBy && performance.now() - asked > s.startBy) played = true;
      if (!cancelled) start();
    });

    const onChange = () => start();
    media.addEventListener("change", onChange);
    document.addEventListener("visibilitychange", onChange);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      // Coming back reconciles with the current state instead of replaying old events.
      if (!visible) {
        stop();
        if (once && !played) {
          played = true;
          impact.current?.();
        }
        setFrame(s.still);
      } else start();
    });
    if (ref.current) io.observe(ref.current);

    return () => {
      cancelled = true;
      stop();
      io.disconnect();
      media.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [action, playKey, s, still]);

  const size = 48 * scale;
  return <img ref={ref} src={judgeSrc(frame)} alt="" width={size} height={size} className={`sprite shrink-0 ${className}`} data-judge={action} data-frame={frame} />;
}
