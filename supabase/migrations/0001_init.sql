-- Pacto — schema, functions, RLS and storage policies.
-- Run once in the Supabase SQL Editor (see README).
--
-- Principles:
--   * Every "day" is a DATE in America/Sao_Paulo, set by the database (sp_today()).
--     The client never chooses the day of a check-in.
--   * Proofs are immutable: no UPDATE/DELETE grants on checkins.
--   * Only members of the same group can read or write anything.
--   * Debts are NOT stored: they are derived from check-ins (see src/lib/ledger.ts).
--     Only payments are stored.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.sp_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique check (invite_code = upper(invite_code) and char_length(invite_code) >= 6),
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  avatar_path text,
  joined_on date not null default public.sp_today(),
  created_at timestamptz not null default now()
);
create index members_group_idx on public.members (group_id);

-- History of day-off choices. The day off in force on date D is the row with the
-- greatest effective_from <= D. Changes apply from the next day, so the past never moves.
create table public.day_off_changes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.members (user_id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

create type public.goal as enum ('study', 'typing', 'reading');

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.members (user_id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  day date not null,
  goal public.goal not null,
  photo_path text not null,
  summary text,
  created_at timestamptz not null default now(),
  unique (user_id, day, goal),
  constraint study_needs_summary check (goal <> 'study' or char_length(trim(coalesce(summary, ''))) >= 40),
  constraint summary_max check (char_length(coalesce(summary, '')) <= 2000)
);
create index checkins_group_day_idx on public.checkins (group_id, day);

-- One dispute per check-in. The verdict is decided by vote (see dispute_results).
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null unique references public.checkins (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references public.members (user_id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 5 and 280),
  reply text check (char_length(reply) <= 280),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index disputes_group_idx on public.disputes (group_id);

create table public.dispute_votes (
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  voter_id uuid not null references public.members (user_id) on delete cascade,
  upheld boolean not null, -- true = "procede" (the check-in is invalid)
  created_at timestamptz not null default now(),
  primary key (dispute_id, voter_id)
);

create type public.debt_item as enum ('coke', 'snack');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  debtor_id uuid not null references public.members (user_id) on delete cascade,
  day date not null,
  item public.debt_item not null,
  received_by uuid not null references public.members (user_id) on delete cascade,
  paid_at timestamptz not null default now(),
  unique (debtor_id, day, item)
);
create index payments_group_idx on public.payments (group_id);

-- ---------------------------------------------------------------------------
-- Membership helpers (security definer so RLS policies can call them without recursion)
-- ---------------------------------------------------------------------------

create or replace function public.my_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.members where user_id = auth.uid()
$$;

create or replace function public.day_off_for(p_user uuid, p_day date)
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select weekday from public.day_off_changes
      where user_id = p_user and effective_from <= p_day
      order by effective_from desc limit 1),
    0)::smallint
$$;

create or replace function public._add_member(p_user uuid, p_group uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (user_id, group_id, display_name)
  values (p_user, p_group, left(trim(p_name), 40));
  insert into public.day_off_changes (user_id, weekday, effective_from)
  values (p_user, 0, public.sp_today()); -- default day off: Sunday
end;
$$;

-- New auth user: join the group if a valid invite code came in the sign-up metadata.
-- Users without a valid code get an auth account but no membership, so RLS hides everything.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
begin
  select id into v_group from public.groups
  where invite_code = upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));

  if v_group is not null then
    perform public._add_member(
      new.id,
      v_group,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: lets the join form validate a code before creating the account.
create or replace function public.check_invite_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.groups where invite_code = upper(trim(p_code)))
$$;

-- RPC: an authenticated user without a group joins with a code.
create or replace function public.join_group(p_code text, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'already a member';
  end if;
  select id into v_group from public.groups where invite_code = upper(trim(p_code));
  if v_group is null then
    raise exception 'invalid invite code';
  end if;
  perform public._add_member(auth.uid(), v_group, p_name);
  return v_group;
end;
$$;

-- RPC: choose the weekly day off. Takes effect tomorrow so past days never change.
create or replace function public.set_day_off(p_weekday smallint)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := public.sp_today() + 1;
begin
  if not exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'not a member';
  end if;
  if p_weekday not between 0 and 6 then
    raise exception 'invalid weekday';
  end if;
  insert into public.day_off_changes (user_id, weekday, effective_from)
  values (auth.uid(), p_weekday, v_from)
  on conflict (user_id, effective_from) do update set weekday = excluded.weekday, created_at = now();
  return v_from;
end;
$$;

-- ---------------------------------------------------------------------------
-- Views (security_invoker: the caller's RLS applies)
-- ---------------------------------------------------------------------------

-- Tribunal verdict. Voters: every member except the check-in owner.
-- upheld   -> absolute majority of eligible voters said "procede"
-- rejected -> "procede" can no longer reach that majority
-- after 72h without either: simple majority of votes cast; a tie keeps the check-in valid.
create view public.dispute_results
with (security_invoker = true)
as
select
  d.id as dispute_id,
  d.checkin_id,
  d.group_id,
  v.yes,
  v.no,
  e.eligible,
  (e.eligible / 2 + 1) as majority,
  d.created_at + interval '72 hours' as closes_at,
  case
    when v.yes >= e.eligible / 2 + 1 then 'upheld'
    when v.no > e.eligible - (e.eligible / 2 + 1) then 'rejected'
    when now() >= d.created_at + interval '72 hours' then
      case when v.yes > v.no then 'upheld' else 'rejected' end
    else 'open'
  end as status
from public.disputes d
join public.checkins c on c.id = d.checkin_id
cross join lateral (
  select count(*) filter (where dv.upheld) as yes,
         count(*) filter (where not dv.upheld) as no
  from public.dispute_votes dv where dv.dispute_id = d.id
) v
cross join lateral (
  select count(*) as eligible from public.members m
  where m.group_id = d.group_id and m.user_id <> c.user_id
) e;

-- Days in which a member has all 3 goals with a valid (not upheld-disputed) check-in.
create view public.completed_days
with (security_invoker = true)
as
select c.user_id, c.day
from public.checkins c
left join public.dispute_results r on r.checkin_id = c.id
where coalesce(r.status, 'none') <> 'upheld'
group by c.user_id, c.day
having count(distinct c.goal) = 3;

-- ---------------------------------------------------------------------------
-- Triggers enforcing business rules
-- ---------------------------------------------------------------------------

create or replace function public.checkins_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.group_id := public.my_group_id();
  new.day := public.sp_today();          -- never trust the client for the date
  new.created_at := now();
  if new.group_id is null then
    raise exception 'not a member';
  end if;
  if new.photo_path not like new.group_id::text || '/' || new.user_id::text || '/%' then
    raise exception 'invalid photo path';
  end if;
  if new.goal <> 'study' then
    new.summary := null;
  end if;
  return new;
end;
$$;

create trigger checkins_before_insert
  before insert on public.checkins
  for each row execute function public.checkins_before_insert();

create or replace function public.disputes_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner uuid;
  v_group uuid;
  v_day date;
begin
  new.author_id := auth.uid();
  new.reply := null;
  new.replied_at := null;
  new.created_at := now();

  select user_id, group_id, day into v_owner, v_group, v_day
  from public.checkins where id = new.checkin_id;
  if not found then
    raise exception 'check-in not found';
  end if;
  if v_owner = new.author_id then
    raise exception 'cannot dispute your own check-in';
  end if;
  if v_day < public.sp_today() - 1 then
    raise exception 'dispute window closed';
  end if;
  new.group_id := v_group;
  return new;
end;
$$;

create trigger disputes_before_insert
  before insert on public.disputes
  for each row execute function public.disputes_before_insert();

-- The author's dispute counts as the first "procede" vote.
create or replace function public.disputes_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dispute_votes (dispute_id, voter_id, upheld) values (new.id, new.author_id, true);
  return new;
end;
$$;

create trigger disputes_after_insert
  after insert on public.disputes
  for each row execute function public.disputes_after_insert();

-- Only the check-in owner replies, once.
create or replace function public.disputes_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.reply is not null then
    raise exception 'already replied';
  end if;
  if char_length(trim(coalesce(new.reply, ''))) = 0 then
    raise exception 'empty reply';
  end if;
  new.replied_at := now();
  return new;
end;
$$;

create trigger disputes_before_update
  before update on public.disputes
  for each row execute function public.disputes_before_update();

create or replace function public.dispute_votes_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
begin
  new.voter_id := auth.uid();
  new.created_at := now();

  select c.user_id into v_owner
  from public.disputes d join public.checkins c on c.id = d.checkin_id
  where d.id = new.dispute_id;
  if not found then
    raise exception 'dispute not found';
  end if;
  if v_owner = new.voter_id then
    raise exception 'owner cannot vote';
  end if;
  select status into v_status from public.dispute_results where dispute_id = new.dispute_id;
  if v_status <> 'open' then
    raise exception 'dispute closed';
  end if;
  return new;
end;
$$;

create trigger dispute_votes_before_insert
  before insert on public.dispute_votes
  for each row execute function public.dispute_votes_before_insert();

-- A payment can only settle a day that really was missed.
-- Mirrors src/lib/ledger.ts (keep both in sync).
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_joined date;
begin
  new.received_by := auth.uid();
  new.group_id := public.my_group_id();
  new.paid_at := now();

  if new.debtor_id = new.received_by then
    raise exception 'cannot mark your own debt as paid';
  end if;
  select joined_on into v_joined from public.members
  where user_id = new.debtor_id and group_id = new.group_id;
  if not found then
    raise exception 'debtor not in your group';
  end if;
  if new.day >= public.sp_today() or new.day < v_joined then
    raise exception 'day is not payable';
  end if;
  if extract(dow from new.day)::smallint = public.day_off_for(new.debtor_id, new.day) then
    raise exception 'day off';
  end if;
  if exists (select 1 from public.completed_days where user_id = new.debtor_id and day = new.day) then
    raise exception 'day was completed';
  end if;
  return new;
end;
$$;

create trigger payments_before_insert
  before insert on public.payments
  for each row execute function public.payments_before_insert();

-- ---------------------------------------------------------------------------
-- Grants (explicit, independent of project defaults)
-- ---------------------------------------------------------------------------

revoke all on public.groups, public.members, public.day_off_changes, public.checkins,
  public.disputes, public.dispute_votes, public.payments,
  public.dispute_results, public.completed_days
  from anon, authenticated;

grant select on public.groups, public.members, public.day_off_changes, public.checkins,
  public.disputes, public.dispute_votes, public.payments,
  public.dispute_results, public.completed_days
  to authenticated;

grant update (display_name, avatar_path) on public.members to authenticated;
grant insert (goal, photo_path, summary) on public.checkins to authenticated;
grant insert (checkin_id, reason) on public.disputes to authenticated;
grant update (reply) on public.disputes to authenticated;
grant insert (dispute_id, upheld) on public.dispute_votes to authenticated;
grant insert (debtor_id, day, item) on public.payments to authenticated;

revoke execute on function public._add_member(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.disputes_after_insert() from public, anon, authenticated;
revoke execute on function public.join_group(text, text) from public, anon;
revoke execute on function public.set_day_off(smallint) from public, anon;
revoke execute on function public.day_off_for(uuid, date) from public, anon;
grant execute on function public.check_invite_code(text) to anon, authenticated;
grant execute on function public.join_group(text, text) to authenticated;
grant execute on function public.set_day_off(smallint) to authenticated;
grant execute on function public.day_off_for(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.day_off_changes enable row level security;
alter table public.checkins enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_votes enable row level security;
alter table public.payments enable row level security;

create policy "groups: members read own group" on public.groups
  for select to authenticated using (id = public.my_group_id());

create policy "members: read same group" on public.members
  for select to authenticated using (group_id = public.my_group_id());
create policy "members: update self" on public.members
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (avatar_path is null or avatar_path like group_id::text || '/' || user_id::text || '/%')
  );

create policy "day_off: read same group" on public.day_off_changes
  for select to authenticated
  using (user_id in (select user_id from public.members where group_id = public.my_group_id()));

create policy "checkins: read same group" on public.checkins
  for select to authenticated using (group_id = public.my_group_id());
create policy "checkins: insert own" on public.checkins
  for insert to authenticated with check (user_id = auth.uid() and group_id = public.my_group_id());

create policy "disputes: read same group" on public.disputes
  for select to authenticated using (group_id = public.my_group_id());
create policy "disputes: insert" on public.disputes
  for insert to authenticated with check (author_id = auth.uid() and group_id = public.my_group_id());
create policy "disputes: owner replies" on public.disputes
  for update to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id = auth.uid()));

create policy "votes: read same group" on public.dispute_votes
  for select to authenticated
  using (exists (select 1 from public.disputes d where d.id = dispute_id and d.group_id = public.my_group_id()));
create policy "votes: insert own" on public.dispute_votes
  for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (select 1 from public.disputes d where d.id = dispute_id and d.group_id = public.my_group_id())
  );

create policy "payments: read same group" on public.payments
  for select to authenticated using (group_id = public.my_group_id());
create policy "payments: receiver inserts" on public.payments
  for insert to authenticated
  with check (received_by = auth.uid() and group_id = public.my_group_id());

-- ---------------------------------------------------------------------------
-- Storage: private bucket "media". Paths: <group_id>/<user_id>/<file>.jpg
-- No update/delete policies: an uploaded proof cannot be replaced.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy "media: read same group" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = public.my_group_id()::text);

create policy "media: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = public.my_group_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );
