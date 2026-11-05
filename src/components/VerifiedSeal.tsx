import { GavelStamp } from "./GavelStamp";

/** "Verificado!": the AI judge confirmed the 3 proofs of the day (animation once per day per device). */
export function VerifiedSeal({ day, userId }: { day: string; userId: string }) {
  return (
    <div className="mb-4 border-b-2 border-divider pb-4">
      <GavelStamp stamp="Verificado!" note="O Juiz IA conferiu as 3 provas de hoje." tone="done" action="stamp" playKey={`verified:${userId}:${day}`} testId="verified" />
    </div>
  );
}
