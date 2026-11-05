\set ON_ERROR_STOP on
begin;
insert into groups(id,name,invite_code) values ('95000000-0000-0000-0000-0000000000a1','Join Day','JOINDAY1');
insert into auth.users(id,email,raw_user_meta_data) values
('95000000-0000-0000-0000-000000000001','join-owner@pacto.test','{"invite_code":"JOINDAY1"}'),
('95000000-0000-0000-0000-000000000002','join-late@pacto.test','{"invite_code":"JOINDAY1"}');
-- A join day followed by an obligation day, both before today and neither a Sunday (the default day off).
create temp table j as
select (select d from generate_series(sp_today() - 9, sp_today() - 2, interval '1 day') g(d)
        where extract(dow from d) <> 0 and extract(dow from d + interval '1 day') <> 0 order by d desc limit 1)::date as day;
grant select on j to authenticated;
update members set joined_on = (select day from j) where user_id = '95000000-0000-0000-0000-000000000002';
update day_off_changes set effective_from = (select day from j) where user_id = '95000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$
declare d date := (select day from j);
begin
  begin
    insert into payments (debtor_id, day, item) values ('95000000-0000-0000-0000-000000000002', d, 'coke');
    raise exception 'FAIL: join day payable';
  exception when raise_exception then
    if sqlerrm not like '%not payable%' then raise; end if;
  end;
  insert into payments (debtor_id, day, item) values ('95000000-0000-0000-0000-000000000002', d + 1, 'coke');
  assert (select count(*) from payments where debtor_id = '95000000-0000-0000-0000-000000000002') = 1, 'the day after joining owes';
end $$;
reset role;
rollback;
select 'JOIN DAY TESTS PASSED' as result;
