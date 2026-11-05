-- Attachments follow the photos: a PDF or ZIP is kept for 30 days after the proof's day, then the daily cron
-- (/api/cron/remind, media-retention.ts) deletes the file and stamps expired_at. The row stays, so the proof page
-- can say the file is no longer kept, and the (checkin_id, kind) uniqueness keeps the owner from uploading it again.
-- Run BEFORE merging: the new app reads expired_at, and the old app ignores the column.
do $$ begin
  if to_regclass('public.welcome_seen') is null then
    raise exception 'Apply 0029_welcome_seen.sql first';
  end if;
end $$;

alter table public.checkin_attachments add column if not exists expired_at timestamptz;
-- Only the server (service role) stamps it; clients keep read-only access through the group policy.
grant update (expired_at) on public.checkin_attachments to service_role;

-- The cron looks for attachments still holding a file, oldest proofs first.
create index if not exists checkin_attachments_live_idx on public.checkin_attachments (checkin_id) where expired_at is null;
