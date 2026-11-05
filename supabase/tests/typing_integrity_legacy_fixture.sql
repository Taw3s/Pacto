-- Prepare an unfinished stale attempt with the old function, before migration 0020.
\set ON_ERROR_STOP on
insert into groups(id,name,invite_code) values ('92000000-0000-0000-0000-0000000000a1','Legacy typing','DEPTH002');
insert into auth.users(id,email,raw_user_meta_data) values ('92000000-0000-0000-0000-000000000001','typing-legacy@pacto.test','{"invite_code":"DEPTH002"}');
select set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000001',false);
set role authenticated;
select * from public.start_typing_test('pc','text','sql-o-que-e');
select * from public.start_typing_test('pc','text','sql-o-que-e');
reset role;
update typing_tests set started_at=now()-interval '61 seconds' where user_id='92000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
  perform public.finish_typing_test((select id from public.typing_tests where user_id=auth.uid() order by id limit 1),80,80,10);
end $$;
reset role;
