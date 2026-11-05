"use client";

/* eslint-disable @next/next/no-img-element -- tiny pixel-art PNGs; next/image would smooth them */
import { useEffect, useState, type ReactNode } from "react";
import { GavelStamp } from "../GavelStamp";

/** Sent by VoteForm when the server accepted the viewer's vote (detail: the dispute id), right before the page refreshes. */
export const VOTED_EVENT = "court:voted";

// 4 frames of 80 ms (Astra brief of 04/11, PR 2): a blank ballot above the slot, halfway in, almost in, then the closed box.
const FRAMES = ["ballot1", "ballot2", "ballot3", "ballotBox"] as const;
const FRAME_MS = 80;

interface Props {
  disputeId: string;
  open: boolean;
  hasVote: boolean;
  /** The verdict, shown when the session is closed. */
  verdict: { tone: "fail" | "done"; stamp: string; note: string; playKey: string };
  /** What an open session shows here: the vote form, "Seu voto…", the defendant's or a late member's note. */
  children: ReactNode;
}

/**
 * The verdict-or-vote area of the courtroom. A client component so it stays mounted while the server swaps the vote form for
 * "Seu voto" or for the verdict, and can tell what the viewer's own confirmed vote did:
 * - the session is still open: a blank ballot drops into the box (320 ms) and "Seu voto foi registrado." appears;
 * - the vote closed it: the judge next to the verdict looks at the result and strikes once (`close`, ~520 ms), the only
 *   movement. It plays here, not on the bench, because the voter is scrolled down to the form. The stamp does not jolt.
 * Nothing while sending, on a failure, on a repeated vote, on a later visit or on another refresh. The ballot never shows
 * the option and the count comes from the server. Reduced motion: the closed box (or the still judge) at once.
 */
export function VoteArea({ disputeId, open, hasVote, verdict, children }: Props) {
  const [pending, setPending] = useState(false); // the server accepted a vote from this page; waiting for the refreshed props
  const [closedLive, setClosedLive] = useState(false);
  const [drops, setDrops] = useState(0); // bumps once per confirmed vote that kept the session open
  const [frame, setFrame] = useState<(typeof FRAMES)[number] | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  // Derived during render, so the verdict shows its judge from its first frame.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (wasOpen && !open && pending) {
      setPending(false);
      setClosedLive(true);
    }
  }
  if (pending && open && hasVote) {
    setPending(false);
    setDrops((n) => n + 1);
  }

  useEffect(() => {
    const onVoted = (e: Event) => (e as CustomEvent<string>).detail === disputeId && setPending(true);
    window.addEventListener(VOTED_EVENT, onVoted);
    return () => window.removeEventListener(VOTED_EVENT, onVoted);
  }, [disputeId]);

  // The frames (~1 KB each) are fetched only where a vote can still be cast.
  useEffect(() => {
    if (open && !hasVote) for (const f of FRAMES) new Image().src = `/lowpoly/${f}.png`;
  }, [open, hasVote]);

  useEffect(() => {
    if (!drops) return;
    if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setFrame("ballotBox");
    const timers = FRAMES.map((f, i) => setTimeout(() => setFrame(f), i * FRAME_MS));
    return () => timers.forEach(clearTimeout);
  }, [drops]);

  if (!open)
    return (
      <GavelStamp
        playKey={closedLive ? `closing:${verdict.playKey}` : verdict.playKey}
        showJudge={closedLive}
        action="close"
        jolt={false}
        tone={verdict.tone}
        stamp={verdict.stamp}
        note={verdict.note}
        testId="verdict"
      />
    );
  return (
    <>
      {children}
      {frame && (
        <div className="mt-3 flex items-center gap-3" role="status" data-testid="ballot-box">
          <img src={`/lowpoly/${frame}.png`} alt="" width={48} height={48} className="sprite h-12 w-12 max-w-none shrink-0" data-frame={frame} />
          <p className="font-medium">Seu voto foi registrado.</p>
        </div>
      )}
    </>
  );
}
