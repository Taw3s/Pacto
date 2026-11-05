"use client";

import { ChevronRight, Pause } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { GroupSummary } from "@/app/api/group-summary/route";
import { Avatar } from "./Avatar";
import { Sprite } from "./Sprite";

const DESKTOP = "(min-width: 75rem)";
const PODIUM = ["text-gold", "text-silver", "text-bronze"];

/**
 * Desktop-only group column for "Hoje", under one title: tribunal, the group's progress today, monthly ranking.
 * Loads in the browser and only when the screen is wide: phones never fetch it.
 */
export function GroupSidebar() {
  const [data, setData] = useState<GroupSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP);
    let cancelled = false;
    let pending: AbortController | null = null;
    const load = () => {
      if (!media.matches || document.visibilityState !== "visible" || pending) return;
      const controller = new AbortController();
      pending = controller;
      fetch("/api/group-summary", { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<GroupSummary>) : Promise.reject()))
        .then((d) => !cancelled && (setData(d), setFailed(false)))
        .catch(() => !cancelled && !controller.signal.aborted && setFailed(true))
        .finally(() => { pending = null; });
    };
    load();
    media.addEventListener("change", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      pending?.abort();
      media.removeEventListener("change", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);

  return (
    // Not sticky (Astra brief of 04/11): a column taller than the window would hide its end; it scrolls with the page.
    <aside aria-labelledby="side-title" className="hidden space-y-4 desk:block" data-testid="group-sidebar">
      <h2 id="side-title" className="pixel text-2xl uppercase leading-7">
        O grupo hoje
      </h2>
      <section className="card" aria-labelledby="side-tribunal">
        <h3 id="side-tribunal" className="pixel flex items-center gap-2 text-xl uppercase leading-6">
          <Sprite name="judgeBench" /> Tribunal
        </h3>
        {!data ? (
          <Placeholder failed={failed} />
        ) : data.tribunals.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhum julgamento aberto.</p>
        ) : (
          <ul className="mt-2">
            {data.tribunals.map((t) => (
              <li key={t.checkinId}>
                <Link href={`/checkin/${t.checkinId}`} className="flex min-h-11 items-center justify-between gap-2 rounded-sm px-1 hover:bg-raised">
                  <span className="min-w-0 break-words">
                    {t.goal} de <b>{t.name}</b> <span className="text-sm text-muted">· {t.day}</span>
                  </span>
                  <span className="pixel shrink-0 text-base uppercase text-warn">Votar</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="side-today">
        <div className="flex items-center justify-between">
          <h3 id="side-today" className="pixel text-xl uppercase leading-6">
            Progresso
          </h3>
          <Link href="/feed" className="flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg">
            Feed <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
        {!data ? (
          <Placeholder failed={failed} />
        ) : (
          <ul className="mt-1 space-y-1">
            {data.today.map((p) => (
              <li key={p.userId}>
                <Link href={`/historico/${p.userId}`} className="flex min-h-11 items-center gap-3 rounded-sm px-1 hover:bg-raised">
                  <Avatar name={p.name} url={p.avatarUrl} size={32} />
                  <span className="min-w-0 flex-1 break-words">
                    {p.name}
                    {p.me && <span className="text-sm text-muted"> · você</span>}
                  </span>
                  {p.off ? (
                    <span className="flex items-center gap-1 text-sm text-off">
                      <Pause size={14} aria-hidden /> Folga
                    </span>
                  ) : (
                    <span className="flex items-center gap-2" aria-label={`${p.done} de 3 metas`}>
                      <span aria-hidden className="flex gap-0.5">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className={`h-3 w-3 rounded-[1px] border-2 ${i < p.done ? "border-done bg-done" : "border-divider bg-bg"}`} />
                        ))}
                      </span>
                      <span aria-hidden className={`pixel tabular w-8 text-right text-base ${p.done === 3 ? "text-done" : "text-muted"}`}>
                        {p.done}/3
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="side-ranking">
        <div className="flex items-center justify-between">
          <h3 id="side-ranking" className="pixel flex items-center gap-2 text-xl uppercase leading-6">
            <Sprite name="trophy" /> Ranking
          </h3>
          <Link href="/ranking" className="flex min-h-11 items-center gap-1 text-sm text-muted hover:text-fg">
            {data?.month ?? "Mês"} <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
        {!data ? (
          <Placeholder failed={failed} />
        ) : data.ranking.every((r) => r.points === 0) ? (
          <p className="mt-2 text-sm text-muted">Ninguém pontuou este mês ainda.</p>
        ) : (
          <ol className="mt-1 space-y-1">
            {data.ranking.map((r) => (
              <li key={r.userId} className="flex min-h-11 items-center gap-3 px-1">
                <span className={`pixel tabular w-7 text-lg ${r.points > 0 && r.position <= 3 ? PODIUM[r.position - 1] : "text-muted"}`}>{r.position}º</span>
                <Avatar name={r.name} url={r.avatarUrl} size={32} />
                <span className="min-w-0 flex-1 break-words">{r.name}</span>
                <span className="pixel tabular text-lg">
                  {r.points} <span className="font-sans text-xs text-muted">pts</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

function Placeholder({ failed }: { failed: boolean }) {
  return failed ? (
    <p className="mt-2 text-sm text-muted">Não foi possível carregar agora.</p>
  ) : (
    <div aria-hidden className="mt-3 space-y-2">
      <div className="h-4 w-3/4 rounded-sm bg-raised" />
      <div className="h-4 w-1/2 rounded-sm bg-raised" />
    </div>
  );
}
