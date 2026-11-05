/* eslint-disable @next/next/no-img-element -- signed URLs */
import { CalendarClock, ChevronRight, Circle, CircleCheck, Pause } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { GroupTabs } from "@/components/GroupTabs";
import { PageHeader } from "@/components/PageHeader";
import { Sprite } from "@/components/Sprite";
import { TypingCard, type TypingScore } from "@/components/TypingCard";
import { PrimaryBadge } from "@/components/StatusBadges";
import { Badge } from "@/components/ui/Badge";
import { formatDayPt, spToday, weekdayOf } from "@/lib/dates";
import { embeddedVerdict, getMembers, requireMember, signThumbs } from "@/lib/data";
import { GOAL_SPRITE } from "@/lib/goal-icons";
import { dayOffOn, type DayOffChange } from "@/lib/ledger";
import { photoIsOlder } from "@/lib/photo-date";
import { typingLabel } from "@/lib/typing";
import { checkinNumbers, goalMeta, GOALS, type Checkin, type DisputeResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { supabase, me } = await requireMember();
  const today = spToday();

  const [members, { data: checkinRows }, { data: changeRows }, { data: resultRows }, { data: typingRows }] = await Promise.all([
    getMembers(supabase),
    supabase.from("checkins").select("*, checkin_reviews(verdict)").eq("day", today).order("created_at"),
    supabase.from("day_off_changes").select("user_id, weekday, effective_from"),
    supabase.from("dispute_results").select("*"),
    supabase.from("typing_tests").select("user_id, wpm, accuracy, score, minutes, device").eq("day", today).not("score", "is", null),
  ]);
  // Today's best typing test per person (what scores), shown on the typing tile.
  const typingBest = new Map<string, TypingScore & { score: number }>();
  for (const t of (typingRows ?? []) as { user_id: string; wpm: number; accuracy: number; score: number; minutes: number; device: "pc" | "mobile" }[]) {
    const cur = typingBest.get(t.user_id);
    if (!cur || Number(t.score) > cur.score)
      typingBest.set(t.user_id, { wpm: Number(t.wpm), accuracy: Number(t.accuracy), score: Number(t.score), minutes: Number(t.minutes), device: t.device });
  }
  const checkins = (checkinRows ?? []) as (Checkin & { checkin_reviews: unknown })[];
  const results = (resultRows ?? []) as DisputeResult[];
  const resultByCheckin = new Map(results.map((r) => [r.checkin_id, r]));
  const reviewOf = new Map(checkins.map((c) => [c.id, embeddedVerdict(c.checkin_reviews)]));

  // Open disputes may concern yesterday's check-ins, so list them separately.
  const openIds = results.filter((r) => r.status === "open").map((r) => r.checkin_id);
  const [urls, { data: openRows }, { data: reactionRows }] = await Promise.all([
    signThumbs(supabase, [...checkins.map((c) => c.photo_path), ...members.map((m) => m.avatar_path)]),
    openIds.length ? supabase.from("checkins").select("*").in("id", openIds) : Promise.resolve({ data: [] as Checkin[] }),
    checkins.length ? supabase.from("checkin_reactions").select("checkin_id").in("checkin_id", checkins.map((c) => c.id)) : Promise.resolve({ data: [] }),
  ]);
  const stamps = new Map<string, number>();
  for (const r of (reactionRows ?? []) as { checkin_id: string }[]) stamps.set(r.checkin_id, (stamps.get(r.checkin_id) ?? 0) + 1);
  const open = (openRows ?? []) as Checkin[];
  const nameOf = new Map(members.map((m) => [m.user_id, m.display_name]));

  const rows = members.map((m) => {
    const changes = (changeRows ?? []).filter((c) => c.user_id === m.user_id) as DayOffChange[];
    const all = checkins.filter((c) => c.user_id === m.user_id);
    const mine = all.filter((c) => c.goal !== "project" && !c.extra);
    const project = all.findLast((c) => c.goal === "project");
    const valid = mine.filter((c) => resultByCheckin.get(c.id)?.status !== "upheld");
    const done = new Set(valid.map((c) => c.goal)).size;
    // Valid extra study sessions, shown as "+N min" next to the study proof.
    const extraMinutes = all
      .filter((c) => c.extra && resultByCheckin.get(c.id)?.status !== "upheld")
      .reduce((sum, c) => sum + (c.minutes ?? 0), 0);
    return { m, mine, project, done, extraMinutes, off: weekdayOf(today) === dayOffOn(changes, today) };
  });
  rows.sort((a, b) => b.done - a.done || b.mine.length - a.mine.length);

  return (
    <div data-wide>
      <PageHeader title="Grupo" subtitle={`Feed de ${formatDayPt(today)}`} />
      <GroupTabs />

      {/* Neutral strip with a small warning mark: yellow is kept for the state and the action. */}
      {open.length > 0 && (
        <section className="card mb-6" aria-labelledby="tribunal">
          <h2 id="tribunal" className="pixel flex items-center gap-2 text-xl uppercase">
            <Sprite name="judgeBench" />
            <span>
              {open.length === 1 ? "1 tribunal em andamento" : `${open.length} tribunais em andamento`}
              <span className="ml-2 inline-block h-3 w-3 rounded-sm bg-warn align-middle" aria-hidden />
            </span>
          </h2>
          <ul className="mt-2">
            {open.map((c) => (
              <li key={c.id}>
                <Link href={`/checkin/${c.id}`} className="flex min-h-11 items-center justify-between gap-2 text-fg">
                  <span>
                    {goalMeta(c.goal).label} de {nameOf.get(c.user_id)} · {formatDayPt(c.day)}
                  </span>
                  <ChevronRight size={20} aria-hidden className="text-warn" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {checkins.length === 0 && (
        <div className="card mb-4 flex flex-wrap items-center gap-3" data-testid="feed-empty">
          <Sprite name="documentTray" />
          <p className="min-w-0 flex-1">As primeiras provas vão aparecer aqui. Envie a sua na tela Hoje.</p>
          <Link href="/hoje" className="btn-secondary min-h-12">
            Ir para Hoje
          </Link>
        </div>
      )}

      {/* Desktop: two equal columns, one card per person, reading order kept (no masonry). */}
      <div className="grid gap-3 desk:grid-cols-2 desk:items-start desk:gap-6">
        {rows.map(({ m, mine, project, done, extraMinutes, off }) => (
          <section key={m.user_id} className="card" data-member={m.display_name} aria-label={m.display_name}>
            {/* A long name keeps whole words: the status badge drops to the next line instead of squeezing it. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Avatar name={m.display_name} url={m.avatar_path ? urls.get(m.avatar_path) : null} />
              <Link href={`/historico/${m.user_id}`} className="flex min-h-11 min-w-[9rem] flex-1 items-center">
                <p className="pixel break-words text-xl uppercase leading-6">
                  {m.display_name}
                  {m.user_id === me.user_id && <span className="text-sm font-normal text-muted"> · você</span>}
                </p>
              </Link>
              {off ? (
                <Badge tone="off" icon={Pause}>Folga</Badge>
              ) : done === 3 ? (
                <Badge tone="done" icon={CircleCheck}>Dia cumprido</Badge>
              ) : (
                <Badge tone="pending" icon={Circle}>
                  <span className="tabular">{done}/3 metas</span>
                </Badge>
              )}
            </div>

            <ul className="mt-3 grid grid-cols-3 gap-2">
              {GOALS.map((g) => {
                // Rows come in creation order: a retake (after its annulled proof) wins.
                const c = mine.findLast((x) => x.goal === g.id);
                if (!c) {
                  return (
                    <li key={g.id}>
                      <div className="mt-2 flex aspect-square flex-col items-center justify-center gap-1 rounded-sm border-2 border-dashed border-divider">
                        <Sprite name={GOAL_SPRITE[g.id]} dim />
                      </div>
                      <p className="pixel mt-1.5 text-base uppercase">{g.label}</p>
                      <p className="text-xs text-muted">{off ? "Opcional" : "Pendente"}</p>
                    </li>
                  );
                }
                const best = g.id === "typing" && c.typing_test_id ? typingBest.get(c.user_id) : undefined;
                const value = best ? typingLabel(best) : checkinNumbers(c);
                const older = photoIsOlder(c.photo_taken_at, c.day);
                return (
                  <li key={g.id}>
                    <Link href={`/checkin/${c.id}`} className="block">
                      {/* Sent: a document in its folder (the tab sits above the photo, never on it). */}
                      <span className="doc-tab block">
                        {best ? (
                          <TypingCard t={best} size="tile" />
                        ) : (
                          <img src={urls.get(c.photo_path)} loading="lazy" decoding="async" alt={`Prova de ${g.label.toLowerCase()} de ${m.display_name}`} className="aspect-square w-full rounded-sm border-2 border-bevel-dark bg-raised object-cover" />
                        )}
                        {(c.extra_photos?.length ?? 0) > 0 && (
                          <span className="tabular absolute bottom-1 right-1 rounded-sm bg-bg/90 px-1 text-xs font-semibold">{c.extra_photos.length + 1} fotos</span>
                        )}
                      </span>
                      <p className="pixel mt-1.5 text-base uppercase">{g.label}</p>
                      {/* The typing card already shows WPM, accuracy and device: the numbers are read once. */}
                      {value && !best && (
                        <p className="tabular text-xs leading-4 text-muted">
                          {value}
                          {g.id === "study" && extraMinutes > 0 && ` + ${extraMinutes} extra`}
                        </p>
                      )}
                    </Link>
                    {/* Fixed order under every proof: tribunal or AI, then the file's date, then the group's stamps. */}
                    <div className="mt-1">
                      <PrimaryBadge dispute={resultByCheckin.get(c.id)?.status} ai={reviewOf.get(c.id)} />
                    </div>
                    {/* The file's date, as context next to the metadata: never over the evidence. */}
                    {older && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-sm bg-warn-bg px-1 text-xs font-semibold leading-4 text-warn" data-testid="photo-older">
                        <CalendarClock size={14} aria-hidden /> Data anterior
                      </p>
                    )}
                    {(stamps.get(c.id) ?? 0) > 0 && (
                      <p className="tabular mt-1 border-t border-divider pt-0.5 text-xs leading-4 text-accent" data-testid="stamp-count">
                        {stamps.get(c.id)} {stamps.get(c.id) === 1 ? "carimbo" : "carimbos"}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>

            {project && (
              <Link href={`/checkin/${project.id}`} className="mt-3 flex min-h-12 items-center gap-2 border-t border-divider pt-3 text-sm">
                <Sprite name="computer" />
                {/* The whole name (it wraps); the badge goes on its own line instead of squeezing it. */}
                <span className="min-w-0 flex-1">
                  <span className="block break-words">Projeto: {project.title}</span>
                  {(resultByCheckin.get(project.id) || reviewOf.get(project.id)) && (
                    <span className="mt-1 block">
                      <PrimaryBadge dispute={resultByCheckin.get(project.id)?.status} ai={reviewOf.get(project.id)} />
                    </span>
                  )}
                </span>
                <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
