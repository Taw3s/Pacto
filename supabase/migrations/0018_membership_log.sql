-- Pacto — membership history for retention. Run once, after 0017_study_prompt.sql.
--
-- * Leaving (0016) deletes the member with their proofs, so a retention count only saw who stayed.
--   Each stay in a group now leaves a row: group, join day, leave day and the weeks with proofs.
-- * No name, e-mail or account link once the person leaves (user_id is cleared). The weeks are counted
--   from the join day, as in supabase/queries/retention.sql.
-- * group_id has no foreign key on purpose: the row outlives a closed group.
-- * Rows are deleted one year after the leave day by the daily cron (/api/cron/remind).
-- * Only stays from now on are recorded: whoever left before this file is gone for good.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'checkins' and column_name = 'study_prompt') then
    raise exception 'Rode supabase/migrations/0017_study_prompt.sql antes deste arquivo.';
  end if;
end $$;

create table public.membership_log (
  id bigint generated always as identity primary key,
  group_id uuid not null,
  user_id uuid unique, -- set while the stay is open, cleared on leaving
  joined_on date not null,
  left_on date,
  active_weeks smallint[], -- weeks (from joined_on) with at least one proof; filled on leaving
  kept_weeks smallint[], -- weeks with at least one complete day; filled on leaving
  constraint open_or_closed check ((user_id is null) = (left_on is not null))
);
create index membership_log_group_idx on public.membership_log (group_id);
alter table public.membership_log enable row level security;
revoke all on public.membership_log from anon, authenticated;
grant select, delete on public.membership_log to service_role;

insert into public.membership_log (group_id, user_id, joined_on)
select group_id, user_id, joined_on from public.members;

create or replace function public.members_log_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.membership_log (group_id, user_id, joined_on) values (new.group_id, new.user_id, new.joined_on);
  return new;
end;
$$;

-- Before the delete, while the proofs still exist (they cascade from members).
create or replace function public.members_log_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active smallint[] := (
    select coalesce(array_agg(w order by w), '{}') from (
      select distinct ((c.day - old.joined_on) / 7)::smallint as w from public.checkins c
      where c.user_id = old.user_id and c.group_id = old.group_id and c.day >= old.joined_on
    ) s);
  v_kept smallint[] := (
    select coalesce(array_agg(w order by w), '{}') from (
      select distinct ((d.day - old.joined_on) / 7)::smallint as w from public.completed_days d
      where d.user_id = old.user_id and d.day >= old.joined_on
    ) s);
begin
  update public.membership_log
  set user_id = null, left_on = public.sp_today(), active_weeks = v_active, kept_weeks = v_kept
  where user_id = old.user_id;
  if not found then
    insert into public.membership_log (group_id, joined_on, left_on, active_weeks, kept_weeks)
    values (old.group_id, old.joined_on, public.sp_today(), v_active, v_kept);
  end if;
  return old;
end;
$$;

-- A group deleted with members in it (the last one leaving, or by hand) removes them first, so the
-- proofs are still there when their stay is closed (cascade order would not guarantee it).
create or replace function public.groups_log_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.members where group_id = old.id;
  return old;
end;
$$;

create trigger members_log_join after insert on public.members for each row execute function public.members_log_join();
create trigger members_log_leave before delete on public.members for each row execute function public.members_log_leave();
create trigger groups_log_close before delete on public.groups for each row execute function public.groups_log_close();

revoke all on function public.members_log_join(), public.members_log_leave(), public.groups_log_close() from public, anon, authenticated;
