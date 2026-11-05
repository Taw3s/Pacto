"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AnswerCheck, Verdict } from "@/lib/ai-review";
import type { JudgeAction } from "@/lib/judge";
import { Judge } from "./Judge";
import { AiBadge, type AiState } from "./StatusBadges";

// The AI's reading of the answer to the question of the day: information for the group, never a verdict.
const ANSWER: Record<AnswerCheck, string> = {
  specific: "responde com detalhes do assunto.",
  vague: "genérica, poderia ter sido escrita sem estudar.",
  off_topic: "não responde à pergunta ou não combina com as fotos.",
};

// Fixed lines per state: the judge raises suspicions, the group decides.
const JUDGE: Record<AiState, { action: JudgeAction; line: string }> = {
  analyzing: { action: "think", line: "Hmm… deixa eu ver essa foto." },
  match: { action: "stamp", line: "O conteúdo visível confere." },
  unclear: { action: "unsure", line: "Não deu para concluir. Fica com o grupo." },
  mismatch: { action: "present", line: "Algo aqui não bate. Levo ao júri." },
  unavailable: { action: "idle", line: "Estou fora do ar agora." },
};

interface Props {
  checkinId: string;
  review: { verdict: Verdict; seen: string; detected: number | null; answer: AnswerCheck | null } | null;
  /** Declared study minutes, to explain a timer divergence. */
  declaredMinutes: number | null;
  ownerName: string;
  isOwner: boolean;
  /** Ask for a review when none exists (recent check-ins only). */
  canRequest: boolean;
  /** No review and the window to ask for one is over (computed on the server, São Paulo date). */
  closed: boolean;
  /** A tribunal decision exists: the analysis stays, but visually secondary. */
  secondary: boolean;
}

/** "Juiz IA": a first-instance reading that never replaces the group's decision. */
export function AiPanel({ checkinId, review, declaredMinutes, ownerName, isOwner, canRequest, closed, secondary }: Props) {
  const router = useRouter();
  const [state, setState] = useState<AiState | "off" | "closed" | null>(
    review ? review.verdict : canRequest ? "analyzing" : closed ? "closed" : null,
  );

  useEffect(() => {
    if (review || !canRequest) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // "busy": a review of this proof is already running (or was just tried); ask again shortly.
    const ask = (n: number) =>
      fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ checkinId }) })
        .then(async (r) => {
          const body = (await r.json().catch(() => ({}))) as { status?: string };
          if (cancelled) return;
          if (r.status === 501) setState("off"); // feature not configured: show nothing
          else if (body.status === "reviewed" || body.status === "exists") router.refresh();
          else if (body.status === "busy" && n < 12) timer = setTimeout(() => ask(n + 1), 5000);
          else if (body.status === "closed") setState("closed"); // the day turned while the page was open
          else setState("unavailable");
        })
        .catch(() => !cancelled && setState("unavailable"));
    ask(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkinId, review, canRequest, router]);

  if (!state || state === "off") return null;
  if (state === "closed")
    return (
      <section aria-labelledby="ai-title" className="card" data-testid="ai-review">
        <h2 id="ai-title" className={`pixel uppercase ${secondary ? "text-base text-muted" : "text-lg leading-6"}`}>
          Juiz IA
        </h2>
        <p className="mt-2 text-sm leading-5 text-muted">O prazo para pedir revisão da IA desta prova terminou.</p>
      </section>
    );

  const timerGap =
    review?.verdict === "mismatch" && declaredMinutes && review.detected !== null
      ? `${isOwner ? "Você informou" : `${ownerName} informou`} ${declaredMinutes} min. A IA identificou um cronômetro com ${review.detected} min na imagem.`
      : null;

  return (
    <section
      aria-labelledby="ai-title"
      className={`card ${!secondary && review?.verdict === "mismatch" ? "!bg-warn-bg" : ""}`}
      data-testid="ai-review"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="ai-title" className={`pixel uppercase ${secondary ? "text-base text-muted" : "text-lg leading-6"}`}>
          Juiz IA
        </h2>
        <AiBadge state={state} />
      </div>
      {!secondary && <Judge action={JUDGE[state].action} line={JUDGE[state].line} playKey={`ai:${checkinId}:${state}`} still={state === "unavailable"} className="mt-2" />}
      {review ? (
        <>
          {timerGap && <p className="mt-2 font-medium">{timerGap}</p>}
          <p className={`mt-2 ${secondary ? "text-sm text-muted" : ""}`}>
            <span className="text-muted">O que a IA viu: </span>
            {review.seen}
          </p>
          {review.verdict === "unclear" && <p className="mt-1 text-sm text-muted">A imagem não permitiu uma conclusão.</p>}
          {review.answer && (
            <p className={`mt-2 ${secondary ? "text-sm text-muted" : ""} ${review.answer !== "specific" && !secondary ? "font-medium" : ""}`} data-testid="ai-answer">
              <span className="text-muted">Resposta à pergunta: </span>
              {ANSWER[review.answer]}
            </p>
          )}
        </>
      ) : state === "analyzing" ? (
        <p className="mt-2 text-sm text-muted">Analisando a foto…</p>
      ) : (
        <p className="mt-2 text-sm text-muted">A análise não está disponível agora. A prova continua enviada normalmente.</p>
      )}
      <p className="mt-2 text-sm text-muted">A análise pode errar e não substitui a decisão do grupo.</p>
    </section>
  );
}
