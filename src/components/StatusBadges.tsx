import { AlertTriangle, CircleCheck, CircleX, CloudOff, Loader, Scale, ScanSearch } from "lucide-react";
import type { Verdict } from "@/lib/ai-review";
import type { DisputeStatus } from "@/lib/types";
import { Badge } from "./ui/Badge";

/**
 * Tribunal decision: a human decision, always shown with priority over the AI. The label names the group as
 * its author (Astra brief of 03/11/2026, block 3), so it never reads as the AI's verdict.
 */
export function TribunalBadge({ status }: { status: DisputeStatus }) {
  if (status === "upheld") return <Badge tone="fail" icon={CircleX}>Grupo rejeitou</Badge>;
  if (status === "rejected") return <Badge tone="done" icon={CircleCheck}>Grupo aceitou</Badge>;
  return <Badge tone="warn" icon={Scale}>Em votação</Badge>;
}

export type AiState = Verdict | "analyzing" | "unavailable";

/** The AI judge's first-instance reading: never a final verdict. "unclear" shows nothing. */
export function AiBadge({ state }: { state: AiState }) {
  switch (state) {
    case "match":
      return <Badge tone="ai" icon={ScanSearch}>IA conferiu</Badge>;
    case "mismatch":
      return <Badge tone="warn" icon={AlertTriangle}>IA diverge</Badge>;
    case "analyzing":
      return <Badge tone="neutral" icon={Loader}>IA analisando</Badge>;
    case "unavailable":
      return <Badge tone="neutral" icon={CloudOff}>IA indisponível</Badge>;
    default:
      return null;
  }
}

/**
 * The one badge to show where space is short: the tribunal decision wins; otherwise the AI reading.
 * Never shows "IA conferiu" next to "Anulado" as if both were equivalent decisions.
 */
export function PrimaryBadge({ dispute, ai }: { dispute?: DisputeStatus | null; ai?: AiState | null }) {
  if (dispute) return <TribunalBadge status={dispute} />;
  if (ai) return <AiBadge state={ai} />;
  return null;
}

/** Who produced the AI reading, under its badge on the proof page. Nothing for "unclear" or while analyzing. */
export function AiAuthorship({ state }: { state: AiState }) {
  const text =
    state === "match"
      ? "Verificação automática pelo juiz IA."
      : state === "mismatch"
        ? "Leitura automática do juiz IA, não é decisão. Só o grupo, no tribunal, pode anular a prova."
        : state === "unavailable"
          ? "Não foi possível verificar agora."
          : null;
  return text ? <p className="mt-1 text-xs leading-4 text-ai" data-testid="ai-authorship">{text}</p> : null;
}
