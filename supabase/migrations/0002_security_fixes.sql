-- Pacto — security fixes (audit PAC-01 .. PAC-06). Run once, after 0001_init.sql.
-- Safe to run on a database that already has data.

-- ---------------------------------------------------------------------------
-- PAC-06: normalise texts in the database and limit their stored length.
-- ---------------------------------------------------------------------------

create or replace function public.members_normalize()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.display_name := trim(new.display_name);
  return new;
end;
$$;

create trigger members_normalize
  before insert or update on public.members
  for each row execute function public.members_normalize();

update public.members set display_name = display_name; -- normalise existing rows

alter table public.members
  add constraint display_name_max check (char_length(display_name) <= 40),
  add constraint avatar_path_max check (char_length(coalesce(avatar_path, '')) <= 200);
alter table public.checkins
  add constraint photo_path_max check (char_length(photo_path) <= 200);
alter table public.disputes
  add constraint reason_max check (char_length(reason) <= 280);

-- ---------------------------------------------------------------------------
-- PAC-01: a check-in only counts if its photo was really uploaded, and a photo
-- proves a single goal.
-- ---------------------------------------------------------------------------

create unique index checkins_photo_path_key on public.checkins (photo_path);

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
  -- The upload must be finished before the check-in (no late or missing proof).
  if not exists (select 1 from storage.objects where bucket_id = 'media' and name = new.photo_path) then
    raise exception 'photo not uploaded';
  end if;
  new.summary := case when new.goal = 'study' then trim(new.summary) end;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- PAC-02: day off is chosen per week. A change takes effect next Monday and
-- there is at most one choice per week, so every Mon–Sun week has exactly one day off.
-- ---------------------------------------------------------------------------

create or replace function public.next_monday(p_day date)
returns date
language sql
immutable
as $$
  select p_day + (8 - extract(isodow from p_day)::int)
$$;

create or replace function public.set_day_off(p_weekday smallint)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from date := public.next_monday(public.sp_today());
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
-- PAC-05: day_off_for runs with the caller's rights, so RLS limits it to the
-- caller's own group (other users fall back to the default and learn nothing).
-- ---------------------------------------------------------------------------

create or replace function public.day_off_for(p_user uuid, p_day date)
returns smallint
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (select weekday from public.day_off_changes
      where user_id = p_user and effective_from <= p_day
      order by effective_from desc limit 1),
    0)::smallint
$$;

-- ---------------------------------------------------------------------------
-- PAC-03: the electorate is frozen when the dispute opens. Members who join
-- later neither change the majority nor vote, so a closed verdict cannot reopen.
-- ---------------------------------------------------------------------------

alter table public.disputes add column eligible integer;

update public.disputes d
set eligible = (
  select count(*) from public.members m join public.checkins c on c.id = d.checkin_id
  where m.group_id = d.group_id and m.user_id <> c.user_id and m.created_at <= d.created_at
);

alter table public.disputes alter column eligible set not null;

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
  new.reason := trim(new.reason);

  select user_id, group_id, day into v_owner, v_group, v_day
  from public.checkins where id = new.checkin_id and group_id = public.my_group_id();
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
  new.eligible := (
    select count(*) from public.members
    where group_id = v_group and user_id <> v_owner and created_at <= new.created_at
  );
  return new;
end;
$$;

create or replace function public.disputes_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.reply is not null then
    raise exception 'already replied';
  end if;
  new.reply := trim(new.reply);
  if char_length(coalesce(new.reply, '')) = 0 then
    raise exception 'empty reply';
  end if;
  new.replied_at := now();
  return new;
end;
$$;

create or replace view public.dispute_results
with (security_invoker = true)
as
select
  d.id as dispute_id,
  d.checkin_id,
  d.group_id,
  v.yes,
  v.no,
  d.eligible::bigint as eligible,
  (d.eligible / 2 + 1)::bigint as majority,
  d.created_at + interval '72 hours' as closes_at,
  case
    when v.yes >= d.eligible / 2 + 1 then 'upheld'
    when v.no > d.eligible - (d.eligible / 2 + 1) then 'rejected'
    when now() >= d.created_at + interval '72 hours' then
      case when v.yes > v.no then 'upheld' else 'rejected' end
    else 'open'
  end as status
from public.disputes d
cross join lateral (
  select count(*) filter (where dv.upheld) as yes,
         count(*) filter (where not dv.upheld) as no
  from public.dispute_votes dv where dv.dispute_id = d.id
) v;

create or replace function public.dispute_votes_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner uuid;
  v_opened timestamptz;
  v_status text;
begin
  new.voter_id := auth.uid();
  new.created_at := now();

  select c.user_id, d.created_at into v_owner, v_opened
  from public.disputes d join public.checkins c on c.id = d.checkin_id
  where d.id = new.dispute_id;
  if not found then
    raise exception 'dispute not found';
  end if;
  if v_owner = new.voter_id then
    raise exception 'owner cannot vote';
  end if;
  if not exists (
    select 1 from public.members where user_id = new.voter_id and created_at <= v_opened
  ) then
    raise exception 'joined after the dispute opened';
  end if;
  select status into v_status from public.dispute_results where dispute_id = new.dispute_id;
  if v_status <> 'open' then
    raise exception 'dispute closed';
  end if;
  return new;
end;
$$;
