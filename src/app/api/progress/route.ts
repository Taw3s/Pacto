import { NextResponse } from "next/server";
import { trustedMutationOrigin } from "@/lib/request-origin";
import { WEEKLY_GOAL_DAYS, weekStart } from "@/lib/collectibles";
import { spToday } from "@/lib/dates";
import { groupToday, missingPhrase, notifyOnce } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Called by the app after a proof is sent. When the sender has just closed the day, the members
 * still missing goals get a social nudge; when the whole group completes the weekly challenge,
 * everyone is told to open the rare chest. Each notice goes out once per person and day.
 */
export async function POST(request: Request) {
  if (!trustedMutationOrigin(request)) return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const me = data?.claims?.sub;
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "disabled" }, { status: 501 });

  const { data: member } = await admin.from("members").select("group_id, display_name").eq("user_id", me).maybeSingle();
  if (!member) return NextResponse.json({ error: "not a member" }, { status: 403 });
  const today = spToday();
  const people = await groupToday(admin, member.group_id);
  const sender = people.find((p) => p.userId === me);
  let nudged = 0;
  let weekly = 0;

  if (sender && sender.done === 3) {
    const missing = people.filter((p) => p.userId !== me && !p.off && p.done < 3);
    nudged = await notifyOnce(admin, missing.map((p) => p.userId), `nudge:${me}`, today, (to) => {
      const others = missing.filter((p) => p.userId !== to).map((p) => p.name);
      return {
        title: `${member.display_name} fechou o dia`,
        body: `${others.length ? "Faltam" : "Falta"} ${missingPhrase(["você", ...others])}. O prazo é 23:59.`,
        url: "/hoje",
      };
    });
  }

  const monday = weekStart(today);
  const { data: week } = await admin.rpc("weekly_progress", { p_group: member.group_id, p_week: monday });
  const rows = (week ?? []) as { user_id: string; done_days: number }[];
  if (rows.length > 0 && rows.every((r) => Number(r.done_days) >= WEEKLY_GOAL_DAYS)) {
    weekly = await notifyOnce(admin, rows.map((r) => r.user_id), "weekly-chest", monday, () => ({
      title: "Desafio da semana cumprido!",
      body: "Todo mundo fechou 5 dias. Abra o baú raro na tela Hoje.",
      url: "/hoje",
    }));
  }
  return NextResponse.json({ nudged, weekly });
}
