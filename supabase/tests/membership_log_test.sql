-- Membership history for retention (0018). Runs after study_prompt_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Everyone in a group today has an open stay.
do $$ begin
  assert (select count(*) from public.membership_log where user_id is not null) = (select count(*) from public.members), 'backfilled';
  assert not exists (select 1 from public.members m left join public.membership_log l using (user_id) where l.id is null), 'one stay per member';
end $$;

-- Nobody reads it from the app.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  begin
    perform 1 from public.membership_log;
    raise exception 'FAIL: authenticated read membership_log';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Zé creates a group and Lia joins it: both stays open.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000021', 'ze@x.com'), ('00000000-0000-0000-0000-000000000022', 'lia@x.com');
select pg_temp.act_as('00000000-0000-0000-0000-000000000021');
set role authenticated;
create temp table ze_group as select public.create_group('Pacto do Zé', 'Zé', array['coffee']) as code;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000022');
set role authenticated;
select public.join_group((select code from ze_group), 'Lia');
reset role;
create temp table ze as select group_id as id from public.members where user_id = '00000000-0000-0000-0000-000000000021';
do $$ begin
  assert (select count(*) from public.membership_log where group_id = (select id from ze) and left_on is null) = 2, 'two open stays';
end $$;

-- Both joined 20 days ago. Lia: complete day in week 0, a reading in week 1. Zé: a study in week 2.
update public.members set joined_on = public.sp_today() - 20 where group_id = (select id from ze);
update public.membership_log set joined_on = public.sp_today() - 20 where group_id = (select id from ze);
set session_replication_role = replica;
insert into public.checkins (user_id, group_id, day, goal, photo_path, summary, minutes, pages)
select u, (select id from ze), public.sp_today() - d, g::public.goal, gen_random_uuid()::text, repeat('s', 50), 60, 5
from (values
  ('00000000-0000-0000-0000-000000000022'::uuid, 19, 'study'),
  ('00000000-0000-0000-0000-000000000022', 19, 'typing'),
  ('00000000-0000-0000-0000-000000000022', 19, 'reading'),
  ('00000000-0000-0000-0000-000000000022', 10, 'reading'),
  ('00000000-0000-0000-0000-000000000021', 3, 'study')
) v(u, d, g);
set session_replication_role = origin;

-- Lia leaves: her proofs go, her stay stays without her.
select pg_temp.act_as('00000000-0000-0000-0000-000000000022');
set role authenticated;
select public.leave_group();
reset role;
do $$ begin
  assert not exists (select 1 from public.checkins where user_id = '00000000-0000-0000-0000-000000000022'), 'proofs gone';
  assert not exists (select 1 from public.membership_log where user_id = '00000000-0000-0000-0000-000000000022'), 'no link to Lia';
  assert exists (select 1 from public.membership_log where group_id = (select id from ze) and left_on = public.sp_today()
    and active_weeks = '{0,1}' and kept_weeks = '{0}'), 'Lia''s weeks kept';
end $$;

-- She joins again: a new stay, the old one untouched.
select pg_temp.act_as('00000000-0000-0000-0000-000000000022');
set role authenticated;
select public.join_group((select code from ze_group), 'Lia');
select public.leave_group();
reset role;
do $$ begin
  assert (select count(*) from public.membership_log where group_id = (select id from ze) and left_on is not null) = 2, 'two closed stays';
end $$;

-- Zé, now alone, leaves: the group closes and his stay survives it, weeks included.
select pg_temp.act_as('00000000-0000-0000-0000-000000000021');
set role authenticated;
do $$ begin
  assert public.leave_group() = 'closed', 'closed';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from public.groups where id = (select id from ze)), 'group deleted';
  assert (select count(*) from public.membership_log where group_id = (select id from ze)) = 3, 'stays outlive the group';
  assert exists (select 1 from public.membership_log where group_id = (select id from ze) and active_weeks = '{2}' and kept_weeks = '{}'), 'Zé''s weeks kept';
end $$;

-- A group deleted by hand with members in it closes their stays too.
create temp table manual as select group_id as id, count(*) as n from public.members group by group_id order by count(*) desc limit 1;
delete from public.groups where id = (select id from manual);
do $$ begin
  assert (select count(*) from public.membership_log where group_id = (select id from manual) and left_on = public.sp_today()) >= (select n from manual), 'stays closed';
  assert not exists (select 1 from public.membership_log where group_id = (select id from manual) and user_id is not null), 'none open';
end $$;

-- The daily cron deletes stays a year after leaving.
update public.membership_log set left_on = public.sp_today() - 366 where group_id = (select id from ze);
set role service_role;
delete from public.membership_log where left_on < public.sp_today() - 365;
reset role;
do $$ begin
  assert not exists (select 1 from public.membership_log where group_id = (select id from ze)), 'purged';
end $$;

select 'MEMBERSHIP LOG TESTS PASSED' as result;
