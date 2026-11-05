import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";

/**
 * Compact person selector: one line with the current person; opens a list of links.
 * Native <details> + links: no client state, works before (and without) JavaScript.
 */
export function PersonPicker({ people, selected, month }: { people: { id: string; name: string }[]; selected: string; month: string }) {
  const current = people.find((p) => p.id === selected);
  return (
    <details className="group relative mb-4 rounded-sm border border-control bg-bg">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-sm text-muted">Histórico de </span>
          <span className="font-semibold">{current?.name}</span>
        </span>
        <ChevronDown size={20} aria-hidden className="text-muted transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <ul className="border-t border-divider py-1" aria-label="Escolher pessoa">
        {people.map((p) => (
          <li key={p.id}>
            <Link
              href={`/historico/${p.id}?m=${month}`}
              aria-current={p.id === selected ? "page" : undefined}
              className="flex min-h-11 items-center justify-between px-3 hover:bg-raised"
            >
              {p.name}
              {p.id === selected && <Check size={18} aria-hidden className="text-accent" />}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
