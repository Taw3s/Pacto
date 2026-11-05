import { ChestOpener, type OpenedItem } from "./ChestOpener";
import { Sprite } from "./Sprite";
import { WEEKLY_GOAL_DAYS } from "@/lib/collectibles";

export interface WeekRow {
  userId: string;
  name: string;
  done: number;
  me: boolean;
}

interface Props {
  dayComplete: boolean;
  daily: OpenedItem | null;
  weekly: OpenedItem | null;
  week: WeekRow[];
  /** The caller was in the group on Monday (only they can open the weekly chest). */
  eligible: boolean;
}

/** "Hoje": the daily chest (after the 3 goals) and the group's weekly challenge. */
export function ChestsPanel({ dayComplete, daily, weekly, week, eligible }: Props) {
  const total = week.reduce((n, r) => n + Math.min(r.done, WEEKLY_GOAL_DAYS), 0);
  const goal = week.length * WEEKLY_GOAL_DAYS;
  const weekDone = week.length > 0 && week.every((r) => r.done >= WEEKLY_GOAL_DAYS);

  return (
    <div className="mb-6 space-y-4">
      <section className="card" aria-labelledby="bau-do-dia" data-testid="daily-chest-card">
        <h2 id="bau-do-dia" className="pixel mb-3 text-xl uppercase leading-6">
          Baú do dia
        </h2>
        {dayComplete || daily ? (
          <ChestOpener kind="daily" opened={daily} label="Você fechou o dia. Abra o baú e ganhe um objeto para a coleção." />
        ) : (
          <div className="flex items-center gap-4">
            <Sprite name="chest1" scale={2} dim />
            <p className="text-sm text-muted">Feche as 3 metas de hoje para abrir o baú: pode sair um objeto comum, raro ou lendário.</p>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="desafio-semana" data-testid="weekly-challenge">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h2 id="desafio-semana" className="pixel text-xl uppercase leading-6">
            Desafio da semana
          </h2>
          <p className="pixel tabular text-lg text-accent" aria-label={`${total} de ${goal} dias do grupo`}>
            {total}/{goal}
          </p>
        </div>
        <p className="mb-3 text-sm text-muted">
          Se todos fecharem {WEEKLY_GOAL_DAYS} dias até domingo, cada um abre um baú raro.
        </p>
        <ul className="space-y-1.5">
          {week.map((r) => (
            <li key={r.userId} className="flex items-center gap-3" data-week-member={r.name}>
              <span className="min-w-0 flex-1 break-words text-sm">
                {r.name}
                {r.me && <span className="text-muted"> · você</span>}
              </span>
              <span aria-hidden className="flex gap-0.5">
                {Array.from({ length: WEEKLY_GOAL_DAYS }, (_, i) => (
                  <span key={i} className={`h-3 w-3 rounded-[1px] border-2 ${i < r.done ? "border-done bg-done" : "border-divider bg-bg"}`} />
                ))}
              </span>
              <span className="pixel tabular w-9 text-right text-base text-muted">
                {Math.min(r.done, WEEKLY_GOAL_DAYS)}/{WEEKLY_GOAL_DAYS}
              </span>
            </li>
          ))}
        </ul>
        {(weekDone && eligible) || weekly ? (
          <div className="mt-4 border-t-2 border-divider pt-4">
            <ChestOpener kind="weekly" opened={weekly} label="Desafio cumprido! O baú da semana só tem objetos raros ou lendários." />
          </div>
        ) : null}
      </section>
    </div>
  );
}
