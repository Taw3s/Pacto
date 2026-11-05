-- Pacto — leave a group, the owner removes a member, delete the account. Run once, after
-- 0015_create_challenge_debt_menu.sql.
--
-- * Someone who leaves takes their own data (proofs, debts, tests) but not the group's history:
--   payments they received, accusations they made and votes they cast stay, without the link to them.
--   Before this file a departure deleted those rows too, so a paid debt reopened for the payer and a
--   closed verdict could flip (the result is counted from the votes).
-- * Payments keep the receiver's name as it was, to show on the receipt after they leave.
-- * The owner who leaves hands the group to the oldest member; the last one to leave closes it.
-- * Only the owner removes a member. Account deletion runs on the server (it also removes photos).

do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'debt_menus') then
    raise exception 'Rode supabase/migrations/0015_create_challenge_debt_menu.sql antes deste arquivo.';
  end if;
end $$;

-- Payments: the receiver may leave; their name stays on the receipt.
alter table public.payments alter column received_by drop not null;
alter table public.payments drop constraint payments_received_by_fkey;
alter table public.payments add constraint payments_received_by_fkey foreign key (received_by) references public.members (user_id) on delete set null;
alter table public.payments add column received_name text;
update public.payments p set received_name = m.display_name from public.members m where m.user_id = p.received_by;

-- Accusations: a member's accusation survives them (an AI accusation never had an author).
alter table public.disputes drop constraint disputes_author_id_fkey;
alter table public.disputes add constraint disputes_author_id_fkey foreign key (author_id) references public.members (user_id) on delete set null;
alter table public.disputes drop constraint disputes_author_or_ai;
alter table public.disputes add constraint disputes_author_or_ai check (not by_ai or author_id is null);

-- The defence's one reply, as in 0002; and now the accuser's link cleared when they leave (members
-- can only update the reply column, so only the foreign key does this).
create or replace function public.disputes_before_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.author_id is null and old.author_id is not null and new.reply is not distinct from old.reply then
    return new;
  end if;
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

-- Votes: a vote survives its voter, so verdicts never change after someone leaves.
alter table public.dispute_votes drop constraint dispute_votes_pkey;
alter table public.dispute_votes add column id bigint generated always as identity primary key;
alter table public.dispute_votes alter column voter_id drop not null;
alter table public.dispute_votes add constraint dispute_votes_once unique (dispute_id, voter_id);
alter table public.dispute_votes drop constraint dispute_votes_voter_id_fkey;
alter table public.dispute_votes add constraint dispute_votes_voter_id_fkey foreign key (voter_id) references public.members (user_id) on delete set null;

-- Same rules as 0015, plus the receiver's name. Mirrors src/lib/ledger.ts (keep both in sync).
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
  new.received_name := (select display_name from public.members where user_id = new.received_by);

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
  if not (new.item = any (public.debt_items_on(new.group_id, new.day))) then
    raise exception 'item not owed that day';
  end if;
  return new;
end;
$$;

/**
 * Takes a member out of their group. The owner's group goes to the oldest remaining member; when
 * nobody remains, the group is deleted. Returns 'left' or 'closed'. Internal: called by the two below.
 */
create or replace function public._drop_member(p_user uuid, p_group uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  perform pg_advisory_xact_lock(hashtext('group:' || p_group::text));
  select m.user_id into v_next from public.members m
  where m.group_id = p_group and m.user_id <> p_user
  order by m.joined_on, m.created_at
  limit 1;
  if v_next is null then
    delete from public.groups where id = p_group;
    return 'closed';
  end if;
  update public.groups set owner_id = v_next where id = p_group and owner_id = p_user;
  delete from public.members where user_id = p_user;
  return 'left';
end;
$$;

/** The signed-in member leaves their group. */
create or replace function public.leave_group()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
begin
  if v_group is null then
    raise exception 'not a member';
  end if;
  return public._drop_member(auth.uid(), v_group);
end;
$$;

/** The owner removes another member from the group. */
create or replace function public.remove_member(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
begin
  if v_group is null or not exists (select 1 from public.groups where id = v_group and owner_id = auth.uid()) then
    raise exception 'only the owner removes members';
  end if;
  if p_user = auth.uid() then
    raise exception 'use leave_group';
  end if;
  if not exists (select 1 from public.members where user_id = p_user and group_id = v_group) then
    raise exception 'not in your group';
  end if;
  return public._drop_member(p_user, v_group);
end;
$$;

revoke all on function public._drop_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.leave_group(), public.remove_member(uuid) from public, anon;
grant execute on function public.leave_group(), public.remove_member(uuid) to authenticated;
-- account deletion: the server leaves the group for the person, then deletes the user
grant execute on function public._drop_member(uuid, uuid) to service_role;
