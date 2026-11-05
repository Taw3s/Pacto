-- Pacto — the AI becomes a first-instance judge. Run once, after 0004_ai_reviews.sql.
--
-- * When the AI says a photo does NOT match the claim, a tribunal opens by itself with the
--   AI as accuser. The AI never votes: only the group can annul a check-in.
-- * Every new vote carries a reason ("why guilty / why innocent"), visible to the group.
--
-- Deploy the app version that sends vote reasons together with this migration.

-- ---------------------------------------------------------------------------
-- Disputes opened by the AI have no human author.
-- ---------------------------------------------------------------------------
alter table public.disputes add column by_ai boolean not null default false;
alter table public.disputes alter column author_id drop not null;
alter table public.disputes
  add constraint disputes_author_or_ai check ((by_ai and author_id is null) or (not by_ai and author_id is not null));

-- Members can only insert (checkin_id, reason): by_ai is never granted to them.
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
  new.reply := null;
  new.replied_at := null;
  new.created_at := now();
  new.reason := trim(new.reason);

  if new.by_ai then
    -- Only reachable from checkin_reviews_after_insert (service side).
    new.author_id := null;
    select user_id, group_id into v_owner, v_group from public.checkins where id = new.checkin_id;
    if not found then
      raise exception 'check-in not found';
    end if;
  else
    new.author_id := auth.uid();
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
  end if;

  new.group_id := v_group;
  new.eligible := (
    select count(*) from public.members
    where group_id = v_group and user_id <> v_owner and created_at <= new.created_at
  );
  return new;
end;
$$;

-- A human author's dispute counts as their "guilty" vote, with the dispute reason.
-- The AI never votes.
create or replace function public.disputes_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.by_ai then
    insert into public.dispute_votes (dispute_id, voter_id, upheld, reason) values (new.id, new.author_id, true, new.reason);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- The AI accuses: a "mismatch" review opens a tribunal (unless one is already open).
-- ---------------------------------------------------------------------------
create or replace function public.checkin_reviews_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verdict = 'mismatch' then
    insert into public.disputes (checkin_id, reason, by_ai)
    values (new.checkin_id, left('Juiz IA: a foto não confere com a meta. Viu: ' || new.seen, 280), true)
    on conflict (checkin_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger checkin_reviews_after_insert
  after insert on public.checkin_reviews
  for each row execute function public.checkin_reviews_after_insert();

-- ---------------------------------------------------------------------------
-- Every vote explains itself. Old votes (before this migration) keep a null reason.
-- ---------------------------------------------------------------------------
alter table public.dispute_votes add column reason text;
alter table public.dispute_votes
  add constraint dispute_votes_reason_len check (reason is null or char_length(reason) between 3 and 280);

grant insert (dispute_id, upheld, reason) on public.dispute_votes to authenticated;

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
  new.reason := nullif(trim(coalesce(new.reason, '')), '');
  if new.reason is null or char_length(new.reason) < 3 then
    raise exception 'vote reason required';
  end if;

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

-- by_ai must be readable by the app (select on disputes is already granted table-wide).
