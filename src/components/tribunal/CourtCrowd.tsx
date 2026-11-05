"use client";

/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */
import { useEffect, useState } from "react";

/** Sent by CourtBench when the judge's opening strike really starts (detail: the session's playKey). */
export const SESSION_EVENT = "court:session";

/**
 * Five staggered rows, back (0) to front (4). The geometry per row lives in globals.css (`.crowd-r0` … `.crowd-r4`, phone
 * and `desk` values): top, half-gap from the centre, pitch between people, sprite size and figure width. The three back
 * rows flank the bench (the half-gap keeps its centre free); the two front rows open the aisle, narrow near the bench and
 * wider at the bottom edge (at most 24 px on the phone, 48 px from `desk`). The front row is larger and cut by the edge.
 */
const SEATS = [8, 8, 8, 8, 5]; // per side; the room's edges cut whatever does not fit
const BENCH_ROWS = 4; // the front row has no visible bench: the edge cuts it at the shoulders

// Fixed order (server and client must match, and a reload shows the same room): neighbours and the person right behind differ.
const variant = (row: number, side: number, seat: number) => ((seat * 2 + row * 3 + side * 5 + (seat >> 1)) % 6) + 1;

/*
 * The settling movement (Astra brief of 04/11): small groups of 2–3 neighbours shift in their seats (pose `a`), almost
 * settle (`b`) and rest, each group with its own delay, everything at rest by 1.2 s. About half the groups move; a row
 * never moves as a whole and nobody reacts to anyone (no booing, no cheering). Seats are grouped from the aisle outwards.
 */
type Pose = "rest" | "a" | "b";
const DELAYS = [0, 90, 180, 270, 360];
const groupOf = (seat: number) => (seat < 2 ? 0 : seat < 5 ? 1 : seat < 7 ? 2 : 3);
const groupKey = (row: number, side: number, seat: number) => `${row}-${side}-${groupOf(seat)}`;
/** The groups that move and when: [key, start in ms]. Fixed, so every visit to a new session looks the same. */
const MOVES: [string, number][] = SEATS.flatMap((seats, row) =>
  [0, 1].flatMap((side) =>
    [0, 1, 2, 3]
      .filter((g) => g <= groupOf(seats - 1) && (row * 7 + side * 3 + g * 5) % 10 < 5)
      .map((g): [string, number] => [`${row}-${side}-${g}`, DELAYS[(row * 3 + side * 2 + g) % DELAYS.length]]),
  ),
);
const SETTLE_AT = 1200;

/**
 * The crowd in the courtroom (Astra brief of 04/11, "salão cheio", final composition): people seen from behind, shoulders
 * overlapping, heads showing between the shoulders of the row ahead, cut at the sides and at the bottom so the room goes
 * on. Scenery only: it never stands for the members, the votes or the decision; hidden from assistive technology and from
 * the pointer. It stays in a closed session too, still (Q4 = A). Only an open session gives it a `cue` (the judge's playKey):
 * it settles once, with the judge's opening strike, and never with reduced motion or on a later visit (the judge does not
 * start, so no event comes).
 */
export function CourtCrowd({ cue }: { cue?: string }) {
  const [poses, setPoses] = useState<Record<string, Pose>>({});

  useEffect(() => {
    if (!cue) return;
    // The two in-between poses are fetched only where they can play (an open session), ~1 KB each.
    for (let v = 1; v <= 6; v++) for (const p of ["a", "b"]) new Image().src = `/lowpoly/crowd${v}${p}.png`;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const settle = () => {
      timers.forEach(clearTimeout);
      timers.length = 0;
      setPoses({});
    };
    const at = (ms: number, key: string, pose: Pose) => timers.push(setTimeout(() => setPoses((now) => ({ ...now, [key]: pose })), ms));
    const onSession = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== cue) return;
      settle();
      MOVES.forEach(([key, start], i) => {
        at(start, key, "a");
        at(start + 260 + (i % 3) * 60, key, "b");
        at(start + 700 + (i % 2) * 80, key, "rest");
      });
      timers.push(setTimeout(settle, SETTLE_AT));
    };
    // A hidden tab does not resume old frames: it comes back settled.
    const onHide = () => document.hidden && settle();
    window.addEventListener(SESSION_EVENT, onSession);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      settle();
      window.removeEventListener(SESSION_EVENT, onSession);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [cue]);

  return (
    <div aria-hidden className="court-crowd pointer-events-none relative -mx-4 overflow-hidden" data-testid="court-crowd">
      {SEATS.map((seats, row) => (
        <div key={row} className={`crowd-r${row} absolute inset-0`}>
          {[-1, 1].map((sign, side) =>
            Array.from({ length: seats }, (_, seat) => (
              <img
                key={`${side}-${seat}`}
                src={`/lowpoly/crowd${variant(row, side, seat)}${pose(poses, row, side, seat)}.png`}
                data-pose={poses[groupKey(row, side, seat)] ?? "rest"}
                alt=""
                width={96}
                height={96}
                className="sprite crowd-seat absolute max-w-none"
                // the figure's centre: past the half-gap, one pitch per seat, plus the row's stagger (globals.css)
                style={{ "--sign": sign, "--seat": seat } as React.CSSProperties}
              />
            )),
          )}
          {/* the bench back of this row shows between the bodies of the row in front */}
          {row < BENCH_ROWS && (
            <>
              <div className="crowd-bench crowd-bench-l" />
              <div className="crowd-bench crowd-bench-r" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function pose(poses: Record<string, Pose>, row: number, side: number, seat: number) {
  const p = poses[groupKey(row, side, seat)];
  return p && p !== "rest" ? p : "";
}
