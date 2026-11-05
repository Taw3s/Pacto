"use client";

import { Gavel, Loader, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ERRORS: Record<string, string> = {
  "dispute closed": "A votação já foi encerrada.",
  "joined after": "Você entrou no grupo depois que esse tribunal foi aberto.",
  "reason required": "Explique seu voto em poucas palavras.",
};

/** Annul / keep the proof, always with a reason the whole group will read. */
export function VoteForm({ disputeId, defendant }: { disputeId: string; defendant: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<"guilty" | "innocent" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ready = !!choice && reason.trim().length >= 3;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setError("");
    const { error } = await createClient()
      .from("dispute_votes")
      .insert({ dispute_id: disputeId, upheld: choice === "guilty", reason: reason.trim() });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "Você já votou."
          : (Object.entries(ERRORS).find(([k]) => error.message.includes(k))?.[1] ?? "Não foi possível votar. Tente de novo."),
      );
      return;
    }
    router.refresh();
  }

  // The consequence first, the game word below: the group judges the proof, not the person.
  const option = (value: "guilty" | "innocent", label: string, word: string, Icon: typeof Gavel, on: string) => (
    <button
      type="button"
      aria-pressed={choice === value}
      onClick={() => setChoice(value)}
      className={`btn-secondary min-h-16 flex-1 flex-col !gap-0.5 py-2 ${choice === value ? on : ""}`}
    >
      <span className="flex items-center gap-2">
        <Icon size={18} aria-hidden />
        {label}
      </span>
      <span className="font-sans text-xs font-medium normal-case">{word}</span>
    </button>
  );

  return (
    <div className="space-y-3" data-testid="vote-form">
      <p className="pixel text-lg uppercase">Seu veredito sobre {defendant}</p>
      <div className="flex gap-2">
        {option("guilty", "Anular a prova", "culpado", Gavel, "!border-fail !bg-fail-bg !text-fail")}
        {option("innocent", "Manter a prova", "inocente", ShieldCheck, "!border-done !bg-done-bg !text-done")}
      </div>
      {choice && (
        <div>
          <label className="label" htmlFor="vote-reason">
            Por quê? (o grupo vai ler)
          </label>
          <textarea
            id="vote-reason"
            className="input min-h-20"
            maxLength={280}
            placeholder={choice === "guilty" ? "Ex.: a foto é de outro dia" : "Ex.: dá pra ver o cronômetro no canto"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-fail">
          {error}
        </p>
      )}
      {choice && (
        <button className="btn-primary w-full" disabled={!ready || busy} onClick={submit}>
          {busy && <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />}
          Confirmar voto
        </button>
      )}
    </div>
  );
}
