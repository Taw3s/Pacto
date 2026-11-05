import type { podium } from "@/lib/ranking";
import { Avatar } from "./Avatar";
import { Sprite } from "./Sprite";

type Podium = ReturnType<typeof podium>;
interface Person {
  name: string;
  url: string | null;
}

const CUP = { 1: "trophy", 2: "trophySilver", 3: "trophyBronze" } as const;
const PLINTH = { 1: "h-[88px]", 2: "h-14", 3: "h-10" } as const;
// Second on the left, first in the middle, third on the right.
const COLUMN = { 1: "col-start-2", 2: "col-start-1", 3: "col-start-3" } as const;
const METAL = { 1: "text-gold", 2: "text-silver", 3: "text-bronze" } as const;

type Place = 1 | 2 | 3;

function names(list: string[]) {
  return list.length <= 1 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} e ${list.at(-1)}`;
}

/**
 * The month's showcase. Steps 2nd / 1st / 3rd when every place has one person; with a tie, level
 * shelves holding everyone at each position ("1º · Ana e Caio", then "3º · Bia"). Never picks
 * three people out of a tie, and nobody with zero points is crowned.
 */
export function Podium({ podium: { groups, tied }, people }: { podium: Podium; people: Map<string, Person> }) {
  if (groups.length === 0) {
    return (
      <section className="card text-center" data-testid="podium" data-podium="empty">
        <Sprite name="trophy" dim className="mx-auto" />
        <p className="mt-2 text-muted">A vitrine está esperando o primeiro resultado.</p>
      </section>
    );
  }

  if (tied) {
    return (
      <section className="card space-y-2 !p-3" data-testid="podium" data-podium="shelves" aria-label="Vitrine do mês">
        {groups.map((g) => {
          const place = g.position as Place;
          const who = g.userIds.map((id) => people.get(id)?.name ?? "?");
          return (
            <div key={g.position} data-position={g.position} className="rounded-sm border-2 border-bevel-dark border-t-bevel-light bg-surface p-3 shadow-[3px_3px_0_var(--color-hard-shadow)]">
              <div className="flex items-center gap-2">
                <Sprite name={CUP[place]} />
                <div className="min-w-0 flex-1">
                  <p className={`pixel text-xl uppercase leading-6 ${METAL[place]}`}>
                    {g.position}º <span className="text-fg">· {names(who)}</span>
                  </p>
                  <p className="text-sm text-muted">
                    <span className="pixel tabular text-2xl text-fg">{g.points}</span> pts {g.userIds.length > 1 && "cada"}
                  </p>
                </div>
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {g.userIds.map((id) => {
                  const p = people.get(id);
                  return (
                    <li key={id} className="flex min-w-0 items-center gap-2 rounded-sm bg-bg py-1 pl-1 pr-2">
                      <Avatar name={p?.name ?? "?"} url={p?.url} size={32} />
                      <span className="break-words text-sm font-semibold">{p?.name ?? "?"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    );
  }

  return (
    <section className="card !p-3" data-testid="podium" data-podium="steps" aria-label="Vitrine do mês">
      <ol className="grid min-h-[232px] grid-cols-3 items-end gap-2">
        {groups.map((g) => {
          const place = g.position as Place;
          const p = people.get(g.userIds[0]);
          return (
            <li key={g.position} data-position={g.position} className={`${COLUMN[place]} row-start-1 flex min-w-0 flex-col items-center text-center`}>
              <Sprite name={CUP[place]} />
              <Avatar name={p?.name ?? "?"} url={p?.url} />
              <p className="mt-1 w-full hyphens-auto break-words text-sm font-semibold leading-5">{p?.name ?? "?"}</p>
              <p className="pixel tabular text-2xl leading-7">{g.points}</p>
              <div
                className={`${PLINTH[place]} mt-1 flex w-full items-start justify-center rounded-sm border-2 border-bevel-dark border-t-bevel-light bg-surface shadow-[3px_3px_0_var(--color-hard-shadow)]`}
              >
                <span className={`pixel tabular text-xl leading-6 ${METAL[place]}`}>{g.position}º</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
