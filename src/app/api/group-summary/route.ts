import { NextResponse } from "next/server";
import { monthName } from "@/components/MonthNav";
import { formatDayPt, monthKey, spToday, weekdayOf } from "@/lib/dates";
import { getMembers, getMonthScores, signUrls } from "@/lib/data";
import { dayOffOn, type DayOffChange } from "@/lib/ledger";
import { createClient } from "@/lib/supabase/server";
import { goalMeta, type Checkin, type DisputeResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export interface GroupSummary {
  month: string;
  today: { userId: string; name: string; avatarUrl: string | null; done: number; off: boolean; me: boolean }[];
  tribunals: { checkinId: string; name: string; goal: string; day: string }[];
  ranking: { userId: string; name: string; avatarUrl: string | null; points: number; position: number }[];
}

/**
 * The group column of the desktop "Hoje" screen. Fetched by the browser only on wide screens,
 * so phones never pay for it. RLS limits every query to the caller's group.
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = spToday();
  const [{ members, scores, pos }, { data: checkinRows }, { data: changeRows }, { data: resultRows }] = await Promise.all([
    getMonthScores(supabase, getMembers(supabase), monthKey(today)),
    supabase.from("checkins").select("id, user_id, goal, extra").eq("day", today),
    supabase.from("day_off_changes").select("user_id, weekday, effective_from"),
    supabase.from("dispute_results").select("checkin_id, status"),
  ]);
  const statusOf = new Map(((resultRows ?? []) as Pick<DisputeResult, "checkin_id" | "status">[]).map((r) => [r.checkin_id, r.status]));
  const openIds = [...statusOf].filter(([, s]) => s === "open").map(([id]) => id);
  const [urls, { data: openRows }] = await Promise.all([
    signUrls(supabase, members.map((m) => m.avatar_path)),
    openIds.length ? supabase.from("checkins").select("id, user_id, goal, day").in("id", openIds) : Promise.resolve({ data: [] }),
  ]);
  const byId = new Map(members.map((m) => [m.user_id, m]));
  const avatar = (userId: string) => {
    const path = byId.get(userId)?.avatar_path;
    return path ? (urls.get(path) ?? null) : null;
  };

  const checkins = (checkinRows ?? []) as Pick<Checkin, "id" | "user_id" | "goal" | "extra">[];
  const todayRows = members
    .map((m) => {
      const changes = (changeRows ?? []).filter((c) => c.user_id === m.user_id) as DayOffChange[];
      // Same rule as the feed: a goal counts with a check-in the tribunal did not annul.
      const done = new Set(
        checkins.filter((c) => c.user_id === m.user_id && c.goal !== "project" && !c.extra && statusOf.get(c.id) !== "upheld").map((c) => c.goal),
      ).size;
      return { userId: m.user_id, name: m.display_name, avatarUrl: avatar(m.user_id), done, off: weekdayOf(today) === dayOffOn(changes, today), me: m.user_id === me };
    })
    .sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));

  const summary: GroupSummary = {
    month: monthName(monthKey(today)),
    today: todayRows,
    tribunals: ((openRows ?? []) as Pick<Checkin, "id" | "user_id" | "goal" | "day">[]).map((c) => ({
      checkinId: c.id,
      name: byId.get(c.user_id)?.display_name ?? "?",
      goal: goalMeta(c.goal).label,
      day: formatDayPt(c.day),
    })),
    ranking: scores.slice(0, 5).map((s, i) => ({
      userId: s.userId,
      name: byId.get(s.userId)?.display_name ?? "?",
      avatarUrl: avatar(s.userId),
      points: s.points,
      position: pos[i],
    })),
  };
  return NextResponse.json(summary, { headers: { "cache-control": "private, no-store" } });
}
