import { NextResponse, type NextRequest } from "next/server";
import { addDays, spToday } from "@/lib/dates";
import { plural } from "@/lib/text";
import { groupToday, notifyOnce } from "@/lib/push";
import { trimOldAttachments, trimOldPhotos } from "@/lib/media-retention";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryPendingMediaCleanup } from "@/lib/membership";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminder (Vercel cron, see vercel.json: 20:00 in São Paulo). Everyone with goals still
 * pending today gets one notice. Safe to call more than once: each person gets at most one a day.
 * The same daily run trims old proofs to their thumbnail (media-retention.ts) and forgets stays that
 * ended over a year ago (membership_log, 0018): the free plan allows two crons, both taken.
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
  const { data: groups } = await admin.from("groups").select("id");
  let reminded = 0;
  for (const g of groups ?? []) {
    const people = (await groupToday(admin, g.id)).filter((p) => !p.off && p.done < 3);
    reminded += await notifyOnce(admin, people.map((p) => p.userId), "reminder", today, (to) => {
      const left = 3 - (people.find((p) => p.userId === to)?.done ?? 0);
      return { title: "Pacto: ainda dá tempo", body: `Falta${left === 1 ? "" : "m"} ${plural(left, "meta", "metas")} hoje. O prazo é 23:59.`, url: "/hoje" };
    });
  }
  const trimmed = await trimOldPhotos(admin, today).catch((e) => {
    console.error("photo trim failed", e);
    return 0;
  });
  const attachmentsExpired = await trimOldAttachments(admin, today).catch((e) => {
    console.error("attachment trim failed", e);
    return 0;
  });
  const { count: forgotten, error } = await admin.from("membership_log").delete({ count: "exact" }).lt("left_on", addDays(today, -365));
  if (error) console.error("membership log purge failed", error);
  const mediaCleaned = await retryPendingMediaCleanup(admin).catch(() => {
    console.error("media cleanup retry failed");
    return 0;
  });
  return NextResponse.json({ reminded, trimmed, attachmentsExpired, forgotten: forgotten ?? 0, mediaCleaned });
}
