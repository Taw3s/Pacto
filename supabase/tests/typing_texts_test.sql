-- Typing texts and progress (0011). Runs after typing_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Bia (user 2) has no tests today.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$
declare t1 uuid; s int; w int;
begin
  begin
    perform public.start_typing_test('pc', 'text', null);
    raise exception 'FAIL: text mode without a text';
  exception when raise_exception then
    if sqlerrm not like '%invalid mode%' then raise; end if;
  end;
  begin
    perform public.start_typing_test('pc', 'words', 'sql-o-que-e');
    raise exception 'FAIL: words mode with a text';
  exception when raise_exception then
    if sqlerrm not like '%invalid mode%' then raise; end if;
  end;
  begin
    perform public.start_typing_test('pc', 'poem', null);
    raise exception 'FAIL: unknown mode';
  exception when raise_exception then
    if sqlerrm not like '%invalid mode%' then raise; end if;
  end;
  -- The old one-argument call still means random words.
  select test_id, start_word into t1, w from public.start_typing_test('pc');
  assert w = 0 and (select mode from public.typing_tests where id = t1) = 'words', 'default mode is words';
  select test_id, start_word into t1, w from public.start_typing_test('pc', 'text', 'sql-o-que-e');
  assert w = 0, 'a new text starts at the beginning';
  -- Members cannot move their place by hand.
  begin
    insert into public.typing_progress (text_id, words) values ('sql-o-que-e', 90);
    raise exception 'FAIL: wrote progress';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

update public.typing_tests set started_at = now() - interval '61 seconds' where user_id = '00000000-0000-0000-0000-000000000002';
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$
declare
  tw uuid := (select id from public.typing_tests where user_id = auth.uid() and mode = 'words');
  tt uuid := (select id from public.typing_tests where user_id = auth.uid() and mode = 'text');
  w int;
begin
  perform public.finish_typing_test(tw, 200, 210);
  assert not exists (select 1 from public.typing_progress), 'random words keep no place';
  begin
    perform public.finish_typing_test(tt, 200, 210, 500);
    raise exception 'FAIL: more words than characters';
  exception when raise_exception then
    if sqlerrm not like '%invalid result%' then raise; end if;
  end;
  perform public.finish_typing_test(tt, 200, 210, 37);
  assert (select words from public.typing_progress where text_id = 'sql-o-que-e') = 37, 'place saved';
  assert (select words_typed from public.typing_tests where id = tt) = 37, 'words stored';
  -- The next test of that text starts there.
  select start_word into w from public.start_typing_test('mobile', 'text', 'sql-o-que-e');
  assert w = 37, format('continues at %s', w);
end $$;
reset role;

update public.typing_tests set started_at = now() - interval '61 seconds' where user_id = '00000000-0000-0000-0000-000000000002' and finished_at is null;
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$
declare t3 uuid := (select id from public.typing_tests where user_id = auth.uid() and finished_at is null);
begin
  -- Reaching the end sends the person back to the start.
  perform public.finish_typing_test(t3, 200, 210, 40, true);
  assert (select words from public.typing_progress where text_id = 'sql-o-que-e') = 0, 'restarted';
end $$;
reset role;

-- Nobody sees someone else's place.
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
set role authenticated;
do $$ begin
  assert (select count(*) from public.typing_progress) = 0, 'progress is private';
end $$;
reset role;

select 'TYPING TEXTS TESTS PASSED' as result;
