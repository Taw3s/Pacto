"use client";

import { Loader, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sprite } from "./Sprite";

const ERRORS: Record<string, string> = {
  "dispute window closed": "Só dá para contestar provas de hoje ou de ontem.",
  "dispute closed": "A votação já foi encerrada.",
  "already replied": "Você já respondeu.",
  "joined after": "Você entrou no grupo depois que essa contestação foi aberta.",
};

function message(error: { message: string; code?: string }) {
  if (error.code === "23505") return "Isso já foi registrado.";
  return Object.entries(ERRORS).find(([k]) => error.message.includes(k))?.[1] ?? "Não foi possível salvar. Tente de novo.";
}

interface Props {
  checkinId?: string;
  disputeId?: string;
  canDispute?: boolean;
  canReply?: boolean;
}

export function DisputeActions({ checkinId, disputeId, canDispute, canReply }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(key: string, action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setBusy(key);
    setError("");
    const { error } = await action();
    setBusy(null);
    if (error) return setError(message(error));
    setText("");
    router.refresh();
  }

  const supabase = createClient();
  const spinner = <Loader size={18} aria-hidden className="animate-[spin_800ms_steps(8)_infinite] motion-reduce:animate-none" />;
  const errorLine = error && (
    <p role="alert" className="text-sm text-fail">
      {error}
    </p>
  );

  if (canDispute) {
    return (
      <section className="card space-y-3" aria-labelledby="contestar">
        <div>
          <h2 id="contestar" className="pixel flex items-center gap-2 text-xl uppercase leading-6">
            <Sprite name="scales" /> Contestar esta prova
          </h2>
          <p className="mt-1 text-sm text-muted">Abre um tribunal: o grupo vota. Se a maioria disser culpado, a prova é anulada e a meta deixa de contar.</p>
        </div>
        <div>
          <label className="label" htmlFor="motivo">
            Motivo
          </label>
          <textarea id="motivo" className="input min-h-20" maxLength={280} placeholder="Explique o que precisa ser conferido" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        {errorLine}
        <button
          className="btn-secondary w-full"
          disabled={!!busy || text.trim().length < 5}
          onClick={() => run("dispute", () => supabase.from("disputes").insert({ checkin_id: checkinId, reason: text.trim() }))}
        >
          {busy ? spinner : <Scale size={18} aria-hidden />}
          Levar ao tribunal
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {canReply && (
        <>
          <label className="label" htmlFor="resposta">
            Sua defesa (só uma vez)
          </label>
          <textarea id="resposta" className="input min-h-20" maxLength={280} value={text} onChange={(e) => setText(e.target.value)} />
          <button
            className="btn-secondary w-full"
            disabled={!!busy || text.trim().length === 0}
            onClick={() => run("reply", () => supabase.from("disputes").update({ reply: text.trim() }).eq("id", disputeId!))}
          >
            {busy && spinner}
            Enviar defesa
          </button>
        </>
      )}
      {errorLine}
    </div>
  );
}
