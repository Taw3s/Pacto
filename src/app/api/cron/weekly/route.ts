import { NextResponse, type NextRequest } from "next/server";
import { WEEKLY_GOAL_DAYS, weekStart } from "@/lib/collectibles";
import { spToday } from "@/lib/dates";
import { notifyOnce } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { plural } from "@/lib/text";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly summary (Vercel cron, see vercel.json: Sundays 21:00 in São Paulo). Each member gets their
 * days, the group's total and where the weekly challenge stands. At most one per person a day.
 */
export async function GET(request: NextRequest) {
  // Closed without the secret: an unset CRON_SECRET must not leave the route open to anyone.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "disabled" }, { status: 501 });

  const today = spToday();
  const monday = weekStart(today);
  const { data: groups } = await admin.from("groups").select("id");
  let summarized = 0;
  for (const g of groups ?? []) {
    const [{ data: members }, { data: done }, { data: challenge }] = await Promise.all([
      admin.from("members").select("user_id").eq("group_id", g.id),
      admin.from("completed_days").select("user_id, day").gte("day", monday).lte("day", today),
      admin.rpc("weekly_progress", { p_group: g.id, p_week: monday }),
    ]);
    const ids = new Set((members ?? []).map((m) => m.user_id as string));
    const mine = new Map<string, number>();
    for (const d of (done ?? []) as { user_id: string }[]) if (ids.has(d.user_id)) mine.set(d.user_id, (mine.get(d.user_id) ?? 0) + 1);
    const total = [...mine.values()].reduce((a, b) => a + b, 0);
    const rows = (challenge ?? []) as { done_days: number }[];
    const reached = rows.filter((r) => Number(r.done_days) >= WEEKLY_GOAL_DAYS).length;
    const complete = rows.length > 0 && reached === rows.length;
    const groupLine = complete
      ? "Desafio da semana cumprido: o baú raro está liberado na tela Hoje."
      : `Desafio da semana: ${reached} de ${rows.length} chegaram a ${WEEKLY_GOAL_DAYS} dias.`;

    summarized += await notifyOnce(admin, [...ids], "weekly-summary", today, (to) => ({
      title: "Pacto: resumo da semana",
      body: `Você fechou ${plural(mine.get(to) ?? 0, "dia", "dias")}. O grupo somou ${plural(total, "dia", "dias")}. ${groupLine}`,
      url: "/hoje",
    }));
  }
  return NextResponse.json({ summarized });
}
