"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The boundary swallows the error: report it (no-op without NEXT_PUBLIC_SENTRY_DSN).
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <div className="card mt-8 space-y-3 text-center">
      <h1 className="text-lg font-semibold">Não foi possível carregar esta tela</h1>
      <p className="text-sm text-muted">Pode ser a conexão. Seus envios já confirmados continuam salvos.</p>
      <button className="btn-secondary mx-auto" onClick={reset}>
        <RotateCw size={18} aria-hidden />
        Tentar de novo
      </button>
    </div>
  );
}
