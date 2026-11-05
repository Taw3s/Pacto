// Web Push from the server. Keys live in public.push_config (service_role only) and are created
// on first use, so there is nothing to configure. Every notice is logged once per person, kind
// and day in public.notification_log, so repeated calls never spam anyone.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { spToday, weekdayOf } from "./dates";
import { dayOffOn, type DayOffChange } from "./ledger";

// Only real push services receive our requests (no arbitrary URL from the database).
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.push\.apple\.com$/, /\.mozilla\.com$/, /\.notify\.windows\.com$/, /^push\.services\.mozilla\.com$/];

function allowedEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    if (url.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(url.hostname))) return true;
    // The end-to-end tests run a fake push service on 127.0.0.1 (never in production).
    const localSite = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://invalid.example");
    return process.env.PUSH_TEST_SERVICE === "1"
      && ["localhost", "127.0.0.1", "[::1]"].includes(localSite.hostname)
      && url.protocol === "http:" && url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function vapidKeys(admin: SupabaseClient) {
  const { data } = await admin.from("push_config").select("public_key, private_key").maybeSingle();
  if (data) return { publicKey: data.public_key as string, privateKey: data.private_key as string };
  const keys = webpush.generateVAPIDKeys();
  await admin.from("push_config").insert({ public_key: keys.publicKey, private_key: keys.privateKey });
  // Another request may have created them first: always use what is stored.
  const { data: stored } = await admin.from("push_config").select("public_key, private_key").single();
  return { publicKey: stored!.public_key as string, privateKey: stored!.private_key as string };
}

export interface Notice {
  title: string;
  body: string;
  url: string;
}

/**
 * Sends `notice(userId)` to each user once per (kind, day). Returns how many people were notified.
 * Subscriptions the push service reports as gone are deleted.
 */
export async function notifyOnce(admin: SupabaseClient, userIds: string[], kind: string, day: string, notice: (userId: string) => Notice) {
  if (userIds.length === 0) return 0;
  const { data: allSubs } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
  const subscribed = [...new Set((allSubs ?? []).map((s) => s.user_id as string))];
  if (subscribed.length === 0) return 0;
  // Claim the (user, kind, day) slots first: whoever inserts the row is the only sender. Only people
  // with notices on are claimed, so turning them on later in the day still works.
  const { data: claimed, error } = await admin
    .from("notification_log")
    .upsert(subscribed.map((user_id) => ({ user_id, kind, day })), { onConflict: "user_id,kind,day", ignoreDuplicates: true })
    .select("user_id");
  if (error) {
    console.error("notification log failed", kind, error.message);
    return 0;
  }
  const fresh = new Set((claimed ?? []).map((r) => r.user_id as string));
  const subs = (allSubs ?? []).filter((s) => fresh.has(s.user_id));
  if (subs.length === 0) return 0;
  const keys = await vapidKeys(admin);
  const subject = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ? process.env.NEXT_PUBLIC_SITE_URL : "mailto:pacto@example.com";
  const notified = new Set<string>();
  await Promise.all(
    subs
      .filter((s) => allowedEndpoint(s.endpoint))
      .map(async (s) => {
        try {
          // web-push encrypts and signs; fetch delivers (web-push's own sender only speaks https).
          const req = webpush.generateRequestDetails(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(notice(s.user_id)),
            { vapidDetails: { subject, publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: 6 * 3600 },
          );
          const res = await fetch(req.endpoint, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: req.body ? new Uint8Array(req.body) : undefined,
            signal: AbortSignal.timeout(8000),
            redirect: "error",
          });
          if (res.ok) notified.add(s.user_id);
          else if (res.status === 404 || res.status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
          else console.error("push failed", res.status);
        } catch (e) {
          console.error("push failed", e instanceof Error ? e.message : e);
        }
      }),
  );
  return notified.size;
}

/** Today's state of every member of a group (admin client: bypasses RLS, server only). */
export async function groupToday(admin: SupabaseClient, groupId: string) {
  const today = spToday();
  const [{ data: members }, { data: checkins }, { data: changes }, { data: upheld }] = await Promise.all([
    admin.from("members").select("user_id, display_name, joined_on").eq("group_id", groupId),
    admin.from("checkins").select("id, user_id, goal, extra").eq("group_id", groupId).eq("day", today),
    admin.from("day_off_changes").select("user_id, weekday, effective_from"),
    admin.from("dispute_results").select("checkin_id").eq("group_id", groupId).eq("status", "upheld"),
  ]);
  const annulled = new Set((upheld ?? []).map((u) => u.checkin_id as string));
  return (members ?? []).map((m) => {
    const goals = new Set(
      (checkins ?? []).filter((c) => c.user_id === m.user_id && c.goal !== "project" && !c.extra && !annulled.has(c.id)).map((c) => c.goal),
    );
    const mine = (changes ?? []).filter((c) => c.user_id === m.user_id) as DayOffChange[];
    return {
      userId: m.user_id as string,
      name: m.display_name as string,
      joinedOn: m.joined_on as string,
      done: goals.size,
      off: weekdayOf(today) === dayOffOn(mine, today),
    };
  });
}

/** "você", "você e Davi", "você, Davi e mais 2" */
export function missingPhrase(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} e ${names[2]}`;
  return `${names[0]}, ${names[1]} e mais ${names.length - 2}`;
}
