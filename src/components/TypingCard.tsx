import { DEVICE_LABEL } from "@/lib/typing";

export interface TypingScore {
  wpm: number;
  accuracy: number;
  device: "pc" | "mobile";
  minutes: number;
}

/**
 * The typing proof drawn from the day's best test. The stored picture is of the first test (proofs
 * cannot be edited), so lists and the proof page draw this instead and follow every new best.
 */
export function TypingCard({ t, size }: { t: TypingScore; size: "thumb" | "tile" | "full" }) {
  const wpm = Math.round(Number(t.wpm));
  const detail = `${Math.round(Number(t.accuracy) * 100)}% · ${DEVICE_LABEL[t.device]}${Number(t.minutes) === 5 ? " · 5 min" : ""}`;
  const label = `Melhor teste de digitação do dia: ${wpm} WPM, ${detail}`;
  if (size === "thumb") {
    return (
      <span role="img" aria-label={label} className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-sm border-2 border-accent bg-bg" data-testid="typing-card">
        <span className="pixel tabular text-xl leading-5 text-accent">{wpm}</span>
        <span className="pixel text-[10px] leading-3 text-muted">WPM</span>
      </span>
    );
  }
  const full = size === "full";
  return (
    <span
      role="img"
      aria-label={label}
      data-testid="typing-card"
      className={`flex aspect-square w-full flex-col items-center justify-center rounded-sm border-accent bg-bg text-center ${full ? "mx-auto max-w-80 border-4" : "border-2"}`}
    >
      <span className={`pixel uppercase text-muted ${full ? "text-base" : "text-[9px] leading-3"}`}>{full ? "Teste de digitação" : "Digitação"}</span>
      <span className={`pixel tabular text-accent ${full ? "text-[96px] leading-[96px]" : "text-3xl leading-8"}`}>{wpm}</span>
      <span className={`pixel text-accent ${full ? "text-2xl" : "text-xs leading-3"}`}>WPM</span>
      <span className={`tabular text-fg ${full ? "mt-3 text-lg" : "mt-1 text-[10px] leading-3"}`}>{detail}</span>
    </span>
  );
}
