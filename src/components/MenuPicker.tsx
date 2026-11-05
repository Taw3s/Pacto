"use client";

import { Check } from "lucide-react";
import { DEBT_ITEM, DEBT_ITEMS, menuPhrase, type DebtItem } from "@/lib/debt-items";
import { Sprite } from "./Sprite";

/**
 * The debt menu: pick 1 or 2 items that each missed day costs. With 2 chosen, the others are
 * disabled until one is removed.
 */
export function MenuPicker({ value, onChange, disabled = false }: { value: DebtItem[]; onChange: (items: DebtItem[]) => void; disabled?: boolean }) {
  function toggle(item: DebtItem) {
    if (value.includes(item)) {
      if (value.length > 1) onChange(value.filter((i) => i !== item));
    } else if (value.length < 2) onChange([...value, item]);
  }
  return (
    <div data-testid="menu-picker">
      <ul className="grid grid-cols-4 gap-2" aria-label="Itens da dívida (escolha 1 ou 2)">
        {DEBT_ITEMS.map((item) => {
          const on = value.includes(item);
          return (
            <li key={item}>
              <button
                type="button"
                aria-pressed={on}
                disabled={disabled || (!on && value.length >= 2)}
                onClick={() => toggle(item)}
                data-item={item}
                className={`relative flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-sm border-2 p-1 text-center text-xs font-semibold leading-tight disabled:opacity-50 ${
                  on ? "border-accent bg-raised text-accent" : "border-bevel-dark bg-bg text-fg hover:bg-raised"
                }`}
              >
                {on && <Check size={14} strokeWidth={3} aria-hidden className="absolute right-1 top-1" />}
                <Sprite name={DEBT_ITEM[item].sprite} />
                {DEBT_ITEM[item].label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-muted" aria-live="polite">
        Cada dia descumprido: <span className="font-semibold text-fg">{menuPhrase(value)}</span>
      </p>
    </div>
  );
}
