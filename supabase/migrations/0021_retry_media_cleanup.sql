-- Preserve cleanup work even after membership/account rows disappear.
-- No foreign keys: a queued deletion must survive deletion of the user and group.
do $$ begin
  if exists(select 1 from pg_proc where oid='public.debt_items_on(uuid,date)'::regprocedure and prosecdef) then
    raise exception 'Apply 0020_debt_menu_rpc_privacy.sql first';
  end if;
end $$;
create table public.media_cleanup_jobs (
  prefix text primary key,
  created_at timestamptz not null default now(),
  check (prefix ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$')
);
alter table public.media_cleanup_jobs enable row level security;
revoke all on public.media_cleanup_jobs from public, anon, authenticated;
grant select, delete on public.media_cleanup_jobs to service_role;

create function public.queue_member_media_cleanup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.media_cleanup_jobs(prefix)
  values (old.group_id::text || '/' || old.user_id::text)
  on conflict (prefix) do nothing;
  return old;
end;
$$;
revoke all on function public.queue_member_media_cleanup() from public, anon, authenticated;
create trigger members_queue_media_cleanup
after delete on public.members
for each row execute function public.queue_member_media_cleanup();
