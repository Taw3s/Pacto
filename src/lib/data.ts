// Server-side data access. RLS guarantees every query only sees the caller's group.
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDebtItem } from "./debt-items";
import { thumbPath } from "./image";
import { createClient } from "./supabase/server";
import type { Verdict } from "./ai-review";
import type { DayOffChange, MemberLedgerInput, Payment } from "./ledger";
import { positions, scoreMonth, typingBestByDay, type RankingCheckin } from "./ranking";
import type { Member, PaymentRow } from "./types";
import { lastDayOfMonth } from "./dates";

const PAGE = 1000; // PostgREST default max rows

/** Fetches every row of a query, page by page, so we never silently stop at 1000 rows. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * Current user + membership. Redirects to login / join when missing.
 * Cached per request: the layout and the page share one lookup. getClaims verifies the JWT
 * locally when the project uses asymmetric signing keys (no round trip to Auth).
 */
export const requireMember = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };

  const { data: me } = await supabase.from("members").select("*").eq("user_id", user.id).maybeSingle<Member>();
  if (!me) redirect("/join?step=code");

  return { supabase, user, me };
});

export async function getMembers(supabase: SupabaseClient): Promise<Member[]> {
  const { data, error } = await supabase.from("members").select("*").order("display_name");
  if (error) throw new Error(error.message);
  return data as Member[];
}

/** Everything the ledger needs for every member of the group. */
export async function getLedgerInputs(supabase: SupabaseClient, members: Member[]) {
  const [changes, completed, payments, { data: menuRows }] = await Promise.all([
    fetchAll<DayOffChange & { user_id: string }>((a, b) =>
      supabase.from("day_off_changes").select("user_id, weekday, effective_from").order("id").range(a, b),
    ),
    fetchAll<{ user_id: string; day: string }>((a, b) =>
      supabase.from("completed_days").select("user_id, day").order("user_id").order("day").range(a, b),
    ),
    fetchAll<PaymentRow>((a, b) => supabase.from("payments").select("*").order("id").range(a, b)),
    // The group's debt menu history (RLS: only the caller's group).
    supabase.from("debt_menus").select("effective_from, items").order("effective_from"),
  ]);

  const inputs = new Map<string, MemberLedgerInput>();
  const paymentsBy = new Map<string, Payment[]>();
  for (const m of members) {
    inputs.set(m.user_id, { joinedOn: m.joined_on, dayOffChanges: [], completedDays: new Set() });
    paymentsBy.set(m.user_id, []);
  }
  for (const c of changes) inputs.get(c.user_id)?.dayOffChanges.push(c);
  for (const c of completed) inputs.get(c.user_id)?.completedDays.add(c.day);
  for (const p of payments) paymentsBy.get(p.debtor_id)?.push(p);
  const menus = ((menuRows ?? []) as { effective_from: string; items: string[] }[]).map((m) => ({
    effective_from: m.effective_from,
    items: m.items.filter(isDebtItem),
  }));
  return { inputs, paymentsBy, menus };
}

/** Signed URLs for private media (photos, avatars). */
export async function signUrls(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;
  const { data } = await supabase.storage.from("media").createSignedUrls(unique, 60 * 60);
  for (const row of data ?? []) if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  return urls;
}

/** Signed URLs for list views: the small thumbnail when it exists, else the full photo. */
export async function signThumbs(supabase: SupabaseClient, paths: (string | null | undefined)[]) {
  const full = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = await signUrls(supabase, [...full, ...full.map(thumbPath)]);
  return new Map(full.flatMap((p) => {
    const url = urls.get(thumbPath(p)) ?? urls.get(p);
    return url ? [[p, url] as const] : [];
  }));
}

/** Reads `checkin_reviews(verdict)` embedded in a check-in row (object, array or null). */
export function embeddedVerdict(embed: unknown): Verdict | null {
  const row = (Array.isArray(embed) ? embed[0] : embed) as { verdict?: Verdict } | null | undefined;
  return row?.verdict ?? null;
}

/**
 * Monthly scores (same rules as the Ranking page) and competition positions ("1, 2, 2, 4").
 * Takes the members as a promise so the caller can load them in the same round trip.
 */
export async function getMonthScores(supabase: SupabaseClient, membersPromise: Promise<Member[]>, month: string) {
  const from = `${month}-01`;
  const to = lastDayOfMonth(from);
  const [members, checkins, upheld, completed, typing] = await Promise.all([
    membersPromise,
    fetchAll<Omit<RankingCheckin, "annulled"> & { id: string; created_at: string }>((a, b) =>
      supabase.from("checkins").select("id, user_id, day, goal, minutes, pages, created_at").gte("day", from).lte("day", to).order("id").range(a, b),
    ),
    fetchAll<{ checkin_id: string }>((a, b) =>
      supabase.from("dispute_results").select("checkin_id").eq("status", "upheld").order("checkin_id").range(a, b),
    ),
    fetchAll<{ user_id: string; day: string }>((a, b) =>
      supabase.from("completed_days").select("user_id, day").gte("day", from).lte("day", to).order("user_id").order("day").range(a, b),
    ),
    fetchAll<{ user_id: string; day: string; score: number; finished_at: string }>((a, b) =>
      supabase.from("typing_tests").select("user_id, day, score, finished_at").gte("day", from).lte("day", to).not("score", "is", null).order("id").range(a, b),
    ),
  ]);
  const annulled = new Set(upheld.map((u) => u.checkin_id));
  const typingBest = typingBestByDay(typing, checkins.filter((c) => c.goal === "typing" && annulled.has(c.id)));
  const scores = scoreMonth(
    members.map((x) => x.user_id),
    checkins.map((c) => ({ ...c, annulled: annulled.has(c.id) })),
    completed,
    typingBest,
  );
  return { members, scores, pos: positions(scores) };
}
