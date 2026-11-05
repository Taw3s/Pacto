-- 5-minute typing tests (0013). Runs after typing_english_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Fab (user 4) has no tests today.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
set role authenticated;
do $$
declare t1 uuid; s int;
begin
  begin
    perform public.start_typing_test('pc', 'words', null, 'pt', 2);
    raise exception 'FAIL: 2-minute test';
  exception when raise_exception then
    if sqlerrm not like '%invalid length%' then raise; end if;
  end;
  select test_id, seconds into t1, s from public.start_typing_test('pc');
  assert s = 60 and (select minutes from public.typing_tests where id = t1) = 1, 'one minute by default';
  select test_id, seconds into t1, s from public.start_typing_test('pc', 'text', 'sql-o-que-e', 'pt', 5);
  assert s = 300 and (select minutes from public.typing_tests where id = t1) = 5, format('five minutes: %s', s);
end $$;
reset role;

-- After four minutes, a 5-minute test is still too early to finish; after five it is fine.
update public.typing_tests set started_at = now() - interval '240 seconds' where user_id = '00000000-0000-0000-0000-000000000004' and minutes = 5;
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
set role authenticated;
do $$
declare t5 uuid := (select id from public.typing_tests where user_id = auth.uid() and minutes = 5);
begin
  begin
    perform public.finish_typing_test(t5, 1000, 1000, 200, false, 130);
    raise exception 'FAIL: finished a 5-minute test after 4';
  exception when raise_exception then
    if sqlerrm not like '%timing%' then raise; end if;
  end;
end $$;
reset role;

update public.typing_tests set started_at = now() - interval '301 seconds' where user_id = '00000000-0000-0000-0000-000000000004' and minutes = 5;
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
set role authenticated;
do $$
declare t5 uuid := (select id from public.typing_tests where user_id = auth.uid() and minutes = 5); r record;
begin
  -- 1500 correct characters in 5 minutes: 60 wpm (the length counts, not one minute).
  select * into r from public.finish_typing_test(t5, 1500, 1500, 290, false, 130);
  assert r.wpm = 60, format('wpm %s', r.wpm);
  -- 290 words over a 130-word text: two passes, then 30 words into the third.
  assert (select words from public.typing_progress where user_id = auth.uid() and text_id = 'sql-o-que-e') = 30, 'place wraps around the text';
end $$;
reset role;

select 'TYPING MINUTES TESTS PASSED' as result;
