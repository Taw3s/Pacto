// Leaving, removal and account deletion: the database decides (leave_group / remove_member / _drop_member),
// then the server deletes the person's photos, which the database cannot reach. Server only.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Lists virtual folders recursively and drains each page after deleting its files. */
async function removeMediaPrefix(admin: SupabaseClient, bucket: "media" | "attachments", prefix: string) {
  const media = admin.storage.from(bucket);
  for (;;) {
    const { data, error: listError } = await media.list(prefix, { limit: 1000 });
    if (listError) throw new Error("media cleanup listing failed");
    if (!data?.length) return;
    for (const folder of data.filter((f) => f.id === null)) {
      await removeMediaPrefix(admin, bucket, `${prefix}/${folder.name}`);
    }
    const files = data.filter((f) => f.id !== null).map((f) => `${prefix}/${f.name}`);
    if (files.length) {
      const { error } = await media.remove(files);
      if (error) throw new Error("media cleanup deletion failed");
    }
    if (data.length < 1000) return;
  }
}

/** Deletes every file under <group>/<user>/ (proof photos, thumbnails, avatar). */
export async function removeUserMedia(admin: SupabaseClient, groupId: string, userId: string) {
  const prefix = `${groupId}/${userId}`;
  await Promise.all([removeMediaPrefix(admin, "media", prefix), removeMediaPrefix(admin, "attachments", prefix)]);
  const { error } = await admin.from("media_cleanup_jobs").delete().eq("prefix", prefix);
  if (error) throw new Error("media cleanup acknowledgement failed");
}

/** Deletes a closed group's files: one folder per member who ever posted. */
export async function removeGroupMedia(admin: SupabaseClient, groupId: string) {
  await Promise.all([removeMediaPrefix(admin, "media", groupId), removeMediaPrefix(admin, "attachments", groupId)]);
  const { error } = await admin.from("media_cleanup_jobs").delete().like("prefix", `${groupId}/%`);
  if (error) throw new Error("media cleanup acknowledgement failed");
}

/** Retries persisted work without blocking other jobs when one storage prefix fails. */
export async function retryPendingMediaCleanup(admin: SupabaseClient) {
  const { data, error } = await admin.from("media_cleanup_jobs").select("prefix").order("created_at").limit(25);
  if (error) throw new Error("media cleanup queue unavailable");
  let cleaned = 0;
  for (const job of data ?? []) {
    try {
      await Promise.all([removeMediaPrefix(admin, "media", job.prefix), removeMediaPrefix(admin, "attachments", job.prefix)]);
      const { error: acknowledgeError } = await admin.from("media_cleanup_jobs").delete().eq("prefix", job.prefix);
      if (acknowledgeError) throw new Error("media cleanup acknowledgement failed");
      cleaned++;
    } catch {
      console.error("queued media cleanup failed; retained for retry");
    }
  }
  return cleaned;
}
