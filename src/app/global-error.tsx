"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";
import "./globals.css";

// Last resort when the root layout itself fails: same words as the (app) error screen.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <main className="mx-auto max-w-[640px] px-4">
          <div className="card mt-8 space-y-3 text-center">
            <h1 className="text-lg font-semibold">Não foi possível carregar esta tela</h1>
            <p className="text-sm text-muted">Pode ser a conexão. Seus envios já confirmados continuam salvos.</p>
            <button className="btn-secondary mx-auto" onClick={reset}>
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
