import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Sprite } from "./Sprite";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function monthName(key: string) {
  return `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
}

/** "‹ Outubro 2026 ›" with 44 px targets. Never navigates into the future. */
export function MonthNav({ month, current, hrefFor }: { month: string; current: string; hrefFor: (m: string) => string }) {
  const btn = "flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-raised hover:text-fg";
  return (
    <div className="card mb-4 flex items-center justify-between !p-1">
      <Link href={hrefFor(shiftMonth(month, -1))} className={btn} aria-label="Mês anterior">
        <ChevronLeft size={22} aria-hidden />
      </Link>
      <h2 className="pixel flex items-center gap-2 text-xl uppercase leading-6">
        <Sprite name="calendar" />
        {monthName(month)}
      </h2>
      {month < current ? (
        <Link href={hrefFor(shiftMonth(month, 1))} className={btn} aria-label="Próximo mês">
          <ChevronRight size={22} aria-hidden />
        </Link>
      ) : (
        <span className={`${btn} pointer-events-none opacity-30`} aria-hidden>
          <ChevronRight size={22} />
        </span>
      )}
    </div>
  );
}
