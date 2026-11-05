"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Sprite } from "@/components/Sprite";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { DEBT_ITEM, itemCount, type DebtItem } from "@/lib/debt-items";

type Props = { debtorId: string; debtorName: string; day: string; dayLabel: string; item: DebtItem };

/** Id of the receipt that replaces this button once the payment exists (focus lands there). */
export const receiptId = (debtorId: string, day: string, item: DebtItem) => `receipt-${debtorId}-${day}-${item}`;

/**
 * The receiver marks a single item of a missed day as paid, after confirming in a dialog. There is
 * no undo (payments have no update/delete grant), so the dialog says so. When the answer is lost,
 * the button checks whether the payment exists before saying it failed or inserting again.
 */
export function PayButton({ debtorId, debtorName, day, dayLabel, item }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"gone" | "paid" | null>(null);
  // The last attempt ended without a clear answer: look before inserting again.
  const [uncertain, setUncertain] = useState(false);
  // On success the dialog stays on "Registrando…" until the list shows the receipt, then closes.
  const [refreshing, startRefresh] = useTransition();
  const [closing, setClosing] = useState(false);
  const [, m, d] = day.split("-");
  const what = itemCount(item, 1);

  useEffect(() => {
    if (closing && !refreshing) {
      setClosing(false);
      setSending(false);
      setOpen(false);
    }
  }, [closing, refreshing]);

  function done() {
    setClosing(true);
    startRefresh(() => router.refresh());
  }

  async function exists() {
    const { data, error } = await createClient()
      .from("payments")
      .select("id")
      .eq("debtor_id", debtorId)
      .eq("day", day)
      .eq("item", item)
      .abortSignal(AbortSignal.timeout(15_000))
      .maybeSingle();
    return error ? null : !!data;
  }

  async function pay() {
    if (sending) return;
    setSending(true);
    setError("");
    if (uncertain) {
      const found = await exists();
      if (found) return done();
      if (found === null) return fail();
    }
    const { error } = await createClient().from("payments").insert({ debtor_id: debtorId, day, item }).abortSignal(AbortSignal.timeout(20_000));
    if (!error) return done();
    if (error.code === "23505") return stop("paid");
    // Raised by payments_before_insert or refused by RLS: the debt is no longer payable by me.
    if (error.code === "P0001" || error.code === "42501") return stop("gone");
    // No answer (network, timeout): it may have been saved anyway.
    const found = await exists();
    if (found) return done();
    if (found === null) setUncertain(true);
    fail();
  }

  function fail() {
    setSending(false);
    setError("Não foi possível confirmar o registro. Confira a lista de dívidas antes de tentar novamente.");
  }

  function stop(kind: "gone" | "paid") {
    setSending(false);
    setNotice(kind);
  }

  function openDialog() {
    setError("");
    setNotice(null);
    setOpen(true);
  }

  // Refreshes before closing, so focus can land on the receipt when it is there.
  const back = done;

  return (
    <>
      <button
        className="btn-secondary min-h-11 shrink-0 px-4 text-sm"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label={`Recebi ${what} de ${debtorName}, ${d}/${m}`}
      >
        Recebi
      </button>
      <ConfirmDialog
        open={open}
        variant="neutral"
        title="Registrar recebimento?"
        confirmLabel="Registrar recebimento"
        busy={sending}
        busyLabel="Registrando…"
        error={error}
        notice={
          notice === "paid"
            ? { message: "Este item já tem recebimento registrado.", actionLabel: "Voltar para dívidas", onAction: back }
            : notice === "gone"
              ? { message: "Esta ação não está mais disponível. Atualize a lista para continuar.", actionLabel: "Atualizar lista", onAction: back }
              : null
        }
        onConfirm={pay}
        onCancel={() => setOpen(false)}
        fallbackFocus={() => document.getElementById(receiptId(debtorId, day, item))}
      >
        <div className="flex items-start gap-3 rounded-sm border-2 border-bevel-dark bg-paper p-3 text-on-paper" data-testid="pay-summary">
          <Sprite name={DEBT_ITEM[item].sprite} />
          <dl className="min-w-0 flex-1">
            <div>
              <dt className="inline font-semibold">Item: </dt>
              <dd className="inline">{what}</dd>
            </div>
            <div className="break-words">
              <dt className="inline font-semibold">De: </dt>
              <dd className="inline">{debtorName}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Dia da dívida: </dt>
              <dd className="inline">{dayLabel}</dd>
            </div>
          </dl>
        </div>
        <p className="font-semibold">Confirme apenas se você já recebeu este item. O registro vale somente para este item deste dia.</p>
        <p>Não há opção de desfazer no app.</p>
      </ConfirmDialog>
    </>
  );
}
