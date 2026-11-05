-- Leaving, removing a member and the group's history (0016). Runs after debt_menu_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Payments made before 0016 got the receiver's name.
do $$ begin
  assert not exists (select 1 from public.payments where received_name is null), 'receiver names filled in';
end $$;

-- A member who is not the owner cannot remove anyone.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  begin
    perform public.remove_member('00000000-0000-0000-0000-000000000006');
    raise exception 'FAIL: non-owner removed a member';
  exception when raise_exception then
    if sqlerrm not like '%only the owner%' then raise; end if;
  end;
  begin
    perform public._drop_member('00000000-0000-0000-0000-000000000006', public.my_group_id());
    raise exception 'FAIL: called the internal function';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Eva (user 5) received Bia's Pix in debt_menu_test.sql. Also pick someone who voted in a tribunal.
create temp table before_leave as
select
  (select count(*) from public.payments where received_by = '00000000-0000-0000-0000-000000000005') as eva_payments,
  v.voter_id as voter, v.dispute_id as dispute,
  (select count(*) from public.dispute_votes x where x.dispute_id = v.dispute_id) as votes,
  (select status from public.dispute_results r where r.dispute_id = v.dispute_id) as status
from (select voter_id, dispute_id from public.dispute_votes
      where voter_id not in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005') limit 1) v;
grant select on before_leave to authenticated;
do $$ begin
  assert (select voter from before_leave) is not null, 'the fixture has a voter to remove';
end $$;

-- The owner (Ana, user 1) removes Eva and the voter.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  begin
    perform public.remove_member('00000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: removed herself';
  exception when raise_exception then
    if sqlerrm not like '%use leave_group%' then raise; end if;
  end;
  begin
    perform public.remove_member('00000000-0000-0000-0000-000000000010');
    raise exception 'FAIL: removed someone of another group';
  exception when raise_exception then
    if sqlerrm not like '%not in your group%' then raise; end if;
  end;
  assert public.remove_member('00000000-0000-0000-0000-000000000005') = 'left', 'removed Eva';
  assert public.remove_member((select voter from before_leave)) = 'left', 'removed the voter';
end $$;
reset role;

do $$
declare b record;
begin
  select * into b from before_leave;
  assert not exists (select 1 from public.members where user_id = '00000000-0000-0000-0000-000000000005'), 'Eva is out';
  assert exists (select 1 from auth.users where id = '00000000-0000-0000-0000-000000000005'), 'her account stays';
  assert b.eva_payments > 0, 'the fixture has payments Eva received';
  assert (select count(*) from public.payments where received_by is null and received_name = 'Eva') = b.eva_payments, 'payments she received stay, with her name';
  assert (select count(*) from public.dispute_votes where dispute_id = b.dispute) = b.votes, 'the votes stay';
  assert (select count(*) from public.dispute_votes where dispute_id = b.dispute and voter_id is null) >= 1, 'the vote lost only its voter';
  assert (select status from public.dispute_results where dispute_id = b.dispute) = b.status, 'the verdict does not change';
  assert not exists (select 1 from public.checkins where user_id = '00000000-0000-0000-0000-000000000005'), 'her proofs leave with her';
end $$;

-- The owner leaves: the group goes to the oldest member left.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  assert public.leave_group() = 'left', 'left';
end $$;
reset role;
do $$ begin
  assert (select owner_id from public.groups where id = '00000000-0000-0000-0000-0000000000a1') =
         (select user_id from public.members where group_id = '00000000-0000-0000-0000-0000000000a1' order by joined_on, created_at limit 1), 'oldest member inherits';
  assert (select owner_id from public.groups where id = '00000000-0000-0000-0000-0000000000a1') <> '00000000-0000-0000-0000-000000000001', 'not Ana any more';
end $$;

-- Someone who left can join another group or create one; leaving twice is refused.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  begin
    perform public.leave_group();
    raise exception 'FAIL: left twice';
  exception when raise_exception then
    if sqlerrm not like '%not a member%' then raise; end if;
  end;
end $$;
reset role;

-- The last member leaves (Ivo, alone in the group he created): the group is deleted.
select pg_temp.act_as('00000000-0000-0000-0000-000000000011');
set role authenticated;
create temp table ivo_group as select public.my_group_id() as id;
do $$ begin
  assert public.leave_group() = 'closed', 'closed';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from public.groups where id = (select id from ivo_group)), 'group deleted';
  assert not exists (select 1 from public.debt_menus where group_id = (select id from ivo_group)), 'its menu too';
end $$;

-- Deleting an account after leaving (what /api/account does) keeps the group's history.
delete from auth.users where id = '00000000-0000-0000-0000-000000000005';
do $$ begin
  assert (select count(*) from public.payments where received_name = 'Eva' and received_by is null) > 0, 'receipts survive the account';
end $$;

select 'MEMBERSHIP TESTS PASSED' as result;
