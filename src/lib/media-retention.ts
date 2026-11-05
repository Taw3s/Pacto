// Storage stays small: a proof keeps its full photos for KEEP_FULL_DAYS; after that only the 480 px
// thumbnail of the first photo is kept (lists and old proofs show it). Run daily by /api/cron/remind.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, type ISODate } from "./dates";

export const KEEP_FULL_DAYS = 30;

/**
 * Deletes the full-size photos of proofs that just turned KEEP_FULL_DAYS old. The window is a week
 * wide, so a few missed runs catch up; deleting a file that is already gone is harmless.
 */
export async function trimOldPhotos(admin: SupabaseClient, today: ISODate) {
  const { data, error } = await admin
    .from("checkins")
    .select("photo_path, extra_photos")
    .gte("day", addDays(today, -(KEEP_FULL_DAYS + 7)))
    .lte("day", addDays(today, -(KEEP_FULL_DAYS + 1)))
    .limit(5000);
  if (error) throw new Error(error.message);
  const paths = (data ?? []).flatMap((c) => [c.photo_path as string, ...((c.extra_photos as string[] | null) ?? [])]).filter((p) => p && !p.endsWith(".thumb.jpg"));
  const media = admin.storage.from("media");
  let removed = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const { data: gone, error: err } = await media.remove(paths.slice(i, i + 100));
    if (err) console.error("photo trim failed", err.message);
    removed += gone?.length ?? 0;
  }
  return removed;
}

/**
 * Attachments (PDF/ZIP) follow the photos: once the proof is older than KEEP_FULL_DAYS the file is deleted and the
 * row is stamped expired_at (0030), so the page can say so and the owner cannot upload it again. No window here:
 * every live attachment past the limit is caught, including one that slipped in on an old proof.
 */
export async function trimOldAttachments(admin: SupabaseClient, today: ISODate) {
  const { data, error } = await admin
    .from("checkin_attachments")
    .select("id, storage_path, checkins!inner(day)")
    .is("expired_at", null)
    .lte("checkins.day", addDays(today, -(KEEP_FULL_DAYS + 1)))
    .limit(1000);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; storage_path: string }[];
  const files = admin.storage.from("attachments");
  let expired = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    // Stamp only after the delete went through: a failed batch stays live and is retried the next day.
    const { error: err } = await files.remove(batch.map((r) => r.storage_path));
    if (err) {
      console.error("attachment trim failed", err.message);
      continue;
    }
    const { error: stampError } = await admin.from("checkin_attachments").update({ expired_at: new Date().toISOString() }).in("id", batch.map((r) => r.id));
    if (stampError) console.error("attachment expiry stamp failed", stampError.message);
    else expired += batch.length;
  }
  return expired;
}
