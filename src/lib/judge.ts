// The judge's animations: which frames (public/lowpoly/judge-*.png, made by tools/lowpoly) play
// in which order and for how long. Purely visual: nothing here decides anything.

export type JudgeAction = "idle" | "think" | "unsure" | "stamp" | "present" | "gavel" | "session";

export interface JudgeSequence {
  frames: { id: string; ms: number }[];
  /** Plays over and over while shown (only the real "analysing" state). */
  loop?: boolean;
  /** Plays every few seconds (resting): random pause between [min, max] ms. */
  every?: [number, number];
  /** Index of the frame where the gavel or the stamp hits. */
  impact?: number;
  /** The frame shown at rest, with reduced motion, and after playing. */
  still: string;
  /** One-shots that only make sense right away: if the frames take longer than this (ms) to load, show the still frame. */
  startBy?: number;
}

const seq = (prefix: string, ms: number[]) => ms.map((m, i) => ({ id: `${prefix}${i + 1}`, ms: m }));

export const JUDGE: Record<JudgeAction, JudgeSequence> = {
  // repouso: blink, then a small shift of posture
  idle: { frames: [{ id: "idle2", ms: 120 }, { id: "idle1", ms: 180 }, { id: "idle3", ms: 420 }, { id: "idle1", ms: 0 }], every: [6000, 10000], still: "idle1" },
  // analisando: brings the paper and the magnifier to the face
  think: { frames: seq("think", [150, 140, 160, 220, 140, 150]), loop: true, still: "think1" },
  // inconclusivo: tilts the head and lowers the paper
  unsure: { frames: seq("unsure", [160, 180, 200, 0]), still: "unsure4" },
  // verificado: approves and stamps the paper
  stamp: { frames: seq("stamp", [140, 120, 160, 70, 180, 110, 160, 0]), impact: 4, still: "stamp8" },
  // contestação aberta: straightens the paper and presents the evidence
  present: { frames: seq("present", [150, 130, 150, 180, 160, 0]), still: "present6" },
  // decisão do júri: raises and strikes the gavel (still frame only since 04/11: a closed tribunal is not replayed)
  gavel: { frames: seq("gavel", [120, 140, 160, 260, 60, 200, 90, 0]), impact: 5, still: "gavel8" },
  // abertura da sessão (Astra brief of 04/11): 300 ms for the audience to shift, one strike between 300 and 800 ms,
  // back to the suspicious rest by ~900 ms. Opening the session, never a conviction.
  session: {
    frames: [
      { id: "idle1", ms: 300 },
      { id: "gavel2", ms: 90 },
      { id: "gavel3", ms: 90 },
      { id: "gavel4", ms: 110 },
      { id: "gavel5", ms: 60 },
      { id: "gavel6", ms: 150 },
      { id: "gavel7", ms: 100 },
      { id: "idle1", ms: 0 },
    ],
    impact: 4,
    still: "idle1",
    startBy: 600,
  },
};

export const judgeSrc = (id: string) => `/lowpoly/judge-${id}.png`;
