import type { LucideIcon } from "lucide-react";

export type Tone = "done" | "fail" | "pending" | "off" | "warn" | "ai" | "neutral";

const TONE: Record<Tone, string> = {
  done: "bg-done-bg text-done",
  fail: "bg-fail-bg text-fail",
  pending: "bg-pending-bg text-pending",
  off: "bg-off-bg text-off",
  warn: "bg-warn-bg text-warn",
  ai: "bg-ai-bg text-ai",
  neutral: "bg-raised text-muted",
};

/** The single badge shape: 24 px min height, 8 px radius, 14 px icon, 12/16 text. Informative, never a button. */
export function Badge({ tone, icon: Icon, children, className = "" }: { tone: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex min-h-6 items-center gap-1 rounded-sm px-2 text-xs font-semibold leading-4 ${TONE[tone]} ${className}`}>
      {Icon && <Icon size={14} strokeWidth={2} aria-hidden />}
      {children}
    </span>
  );
}
