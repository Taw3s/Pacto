"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { PayButton, receiptId } from "@/components/PayButton";
import { Sprite } from "@/components/Sprite";
import { Badge } from "@/components/ui/Badge";
import { DEBT_ITEM, itemCount, type DebtItem } from "@/lib/debt-items";
import { plural } from "@/lib/text";

export interface DebtDay {
  day: string;
  label: string; // "Seg 19/10"
  overdue: boolean;
  items: { item: DebtItem; receivedBy: string | null }[];
}

interface Props {
  debtorId: string;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  /** Open items per kind, in catalog order. */
  counts: [DebtItem, number][];
  overdue: number;
  days: DebtDay[];
}


/**
 * One card per person: the open items of the group's menu on a small wooden shelf (counted apart,
 * they can differ after partial payments); expanding reveals each day and item, each with its own "Recebi".
 */
export function DebtorRow({ debtorId, name, avatarUrl, isMe, counts, overdue, days }: Props) {
  // Client state survives router.refresh(), so confirming a payment keeps the row open and in place.
  const [open, setOpen] = useState(false);
  const owes = counts.length > 0;
  const panelId = `debts-${debtorId}`;

  return (
    <li className={`card !p-0 ${isMe ? "!border-accent" : ""}`} data-debtor={name}>
      <button
        className="flex min-h-16 w-full items-center gap-3 p-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        disabled={days.length === 0}
      >
        <Avatar name={name} url={avatarUrl} />
        <span className="min-w-0 flex-1">
          <span className="block break-words font-semibold">
            {name}
            {isMe && <span className="ml-1.5 rounded-sm bg-accent px-1 text-xs font-bold uppercase text-on-accent">Você</span>}
          </span>
          <span className="tabular block text-sm text-muted" data-testid="summary">
            {owes ? counts.map(([item, n]) => itemCount(item, n)).join(" · ") : "Em dia"}
          </span>
        </span>
        {days.length > 0 && <ChevronDown size={20} aria-hidden className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />}
      </button>
      {owes && (
        <div className="px-3 pb-3">
          <div aria-hidden className="flex flex-wrap items-end gap-x-4 px-2">
            {counts.map(([item, n]) => (
              <span key={item} className="flex items-end">
                <Sprite name={DEBT_ITEM[item].sprite} />
                <span className="pixel tabular -ml-1 text-2xl font-bold leading-7 text-accent">×{n}</span>
              </span>
            ))}
          </div>
          <div aria-hidden className="h-2 rounded-[1px] border-b-4 border-wood-dark bg-wood shadow-[3px_3px_0_var(--color-hard-shadow)]" />
          {/* The ledger counts open items (a day = its menu's items) from previous months. */}
          {overdue > 0 && (
            <p className="mt-2">
              <Badge tone="fail">{plural(overdue, "item atrasado", "itens atrasados")}</Badge>
            </p>
          )}
        </div>
      )}

      {open && (
        <div id={panelId} className="border-t border-divider px-3 pb-2">
          {days.map((d) => (
            <div key={d.day} className="border-b border-divider py-3 last:border-b-0">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {d.label}
                {d.overdue && <Badge tone="fail">Atrasada</Badge>}
              </p>
              <ul>
                {d.items.map(({ item, receivedBy }) => {
                  // A received item becomes its own receipt; the rest of the day keeps its action.
                  if (receivedBy) {
                    return (
                      <li key={item} id={receiptId(debtorId, d.day, item)} tabIndex={-1} className="receipt my-2" data-receipt={item}>
                        <p className="pixel text-lg leading-6">Recebimento registrado</p>
                        <p className="mt-1 flex items-center gap-2 text-sm">
                          <Sprite name={DEBT_ITEM[item].sprite} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{DEBT_ITEM[item].label}</span>
                            <span className="block">Dia da dívida: {d.label}</span>
                            <span className="block break-words">Recebido por {receivedBy}</span>
                          </span>
                        </p>
                        {/* On its own line, so a long name keeps the whole width. */}
                        <p className="mt-2 flex justify-end">
                          <span className="receipt-stamp">Recebido</span>
                        </p>
                      </li>
                    );
                  }
                  return (
                    <li key={item} className="flex min-h-12 items-center gap-3">
                      <Sprite name={DEBT_ITEM[item].sprite} />
                      <span className="flex-1">{DEBT_ITEM[item].label}</span>
                      {isMe ? (
                        <span className="text-sm text-muted">Em aberto</span>
                      ) : (
                        <PayButton debtorId={debtorId} debtorName={name} day={d.day} dayLabel={d.label} item={item} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
