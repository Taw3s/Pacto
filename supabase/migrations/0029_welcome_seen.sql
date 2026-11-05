-- Welcome on joining a group (Astra brief of 03/11/2026, block 3; owner's answer Q1 = C): shown once per person and
-- group on any device. Only the moment it was shown is kept, and only the person can read it. Leaving the group,
-- being removed or deleting the account removes the row with the membership.
do $$ begin
  if to_regclass('public.checkin_attachments') is null
     or not exists (select 1 from pg_constraint where conrelid = 'public.checkins'::regclass and conname = 'project_requires_github_url') then
    raise exception 'Apply 0028_checkin_attachments.sql first';
  end if;
end $$;

create table if not exists public.welcome_seen (
  user_id uuid primary key references public.members (user_id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.welcome_seen enable row level security;
revoke all on public.welcome_seen from public, anon, authenticated;
grant select on public.welcome_seen to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'welcome_seen' and policyname = 'welcome seen: read own') then
    create policy "welcome seen: read own" on public.welcome_seen for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- Whoever is already in a group joined before the welcome existed: no late welcome for them.
insert into public.welcome_seen (user_id, group_id)
select m.user_id, m.group_id from public.members m
where not exists (select 1 from public.welcome_seen w where w.user_id = m.user_id);

/** Marks the caller's welcome as shown, for their current group. Idempotent; never touches anyone else. */
create or replace function public.mark_welcome_seen()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.welcome_seen (user_id, group_id)
  select m.user_id, m.group_id from public.members m where m.user_id = auth.uid()
  on conflict (user_id) do nothing;
$$;
revoke all on function public.mark_welcome_seen() from public, anon;
grant execute on function public.mark_welcome_seen() to authenticated;
