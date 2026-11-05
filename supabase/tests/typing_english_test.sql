-- Typing in English (0012). Runs after typing_texts_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Eva (user 5) has no tests today.
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
set role authenticated;
do $$
declare t1 uuid;
begin
  begin
    perform public.start_typing_test('pc', 'words', null, 'es');
    raise exception 'FAIL: unknown language';
  exception when raise_exception then
    if sqlerrm not like '%invalid language%' then raise; end if;
  end;
  begin
    perform public.start_typing_test('pc', 'text', 'sql-o-que-e', 'en');
    raise exception 'FAIL: Portuguese text as English';
  exception when raise_exception then
    if sqlerrm not like '%invalid language%' then raise; end if;
  end;
  begin
    perform public.start_typing_test('pc', 'text', 'en-sql-what', 'pt');
    raise exception 'FAIL: English text as Portuguese';
  exception when raise_exception then
    if sqlerrm not like '%invalid language%' then raise; end if;
  end;
  assert (select count(*) from public.typing_tests where user_id = auth.uid()) = 0, 'refused starts use no attempt';
  select test_id into t1 from public.start_typing_test('pc');
  assert (select lang from public.typing_tests where id = t1) = 'pt', 'Portuguese by default';
  select test_id into t1 from public.start_typing_test('pc', 'words', null, 'en');
  assert (select lang from public.typing_tests where id = t1) = 'en', 'English words';
  select test_id into t1 from public.start_typing_test('mobile', 'text', 'en-sql-what', 'en');
  assert (select lang || text_id from public.typing_tests where id = t1) = 'enen-sql-what', 'English text';
end $$;
reset role;

select 'TYPING ENGLISH TESTS PASSED' as result;
