\set ON_ERROR_STOP on
begin;
select set_config('request.jwt.claim.sub','92000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
  begin
    perform public.finish_typing_test((select id from public.typing_tests where user_id=auth.uid() and finished_at is null),80,80,10);
    raise exception 'FAIL: unfinished legacy attempt rewound progress after upgrade';
  exception when raise_exception then
    if sqlerrm not like '%stale typing test%' then raise; end if;
  end;
end $$;
reset role;
insert into groups(id,name,invite_code) values ('91000000-0000-0000-0000-0000000000a1','Typing integrity','DEPTH001');
insert into auth.users(id,email,raw_user_meta_data) values ('91000000-0000-0000-0000-000000000001','typing-integrity@pacto.test','{"invite_code":"DEPTH001"}');
select set_config('request.jwt.claim.sub','91000000-0000-0000-0000-000000000001',false);
set role authenticated;
create temp table integrity_runs as select * from public.start_typing_test('pc','text','sql-o-que-e');
insert into integrity_runs select * from public.start_typing_test('pc','text','sql-o-que-e');
reset role;
update typing_tests set started_at=now()-interval '61 seconds' where user_id='91000000-0000-0000-0000-000000000001';
set role authenticated;
do $$ declare a uuid; b uuid; begin
  select test_id into a from integrity_runs limit 1;
  select test_id into b from integrity_runs where test_id<>a limit 1;
  begin
    perform public.finish_typing_test(a,10,10,10);
    raise exception 'FAIL: ten completed words accepted with only ten typed characters';
  exception when raise_exception then
    if sqlerrm not like '%invalid result%' then raise; end if;
  end;
  begin
    perform public.finish_typing_test(a,80,80,10,false,1);
    raise exception 'FAIL: forged text length accepted';
  exception when raise_exception then
    if sqlerrm not like '%invalid text length%' then raise; end if;
  end;
  perform public.finish_typing_test(a,80,80,10);
  begin
    perform public.finish_typing_test(b,10,10,1);
    raise exception 'FAIL: stale attempt rewound progress';
  exception when raise_exception then
    if sqlerrm not like '%stale typing test%' then raise; end if;
  end;
  assert (select words from public.typing_progress where user_id=auth.uid() and text_id='sql-o-que-e')=10, 'progress preserved';
  begin
    perform public.start_typing_test('pc','text','invented-text-not-in-catalog');
    raise exception 'FAIL: unknown text accepted';
  exception when raise_exception then
    if sqlerrm not like '%invalid text%' then raise; end if;
  end;
end $$;
create temp table next_integrity_run as select * from public.start_typing_test('mobile','text','sql-o-que-e');
do $$ begin
  assert (select start_word from next_integrity_run)=10, 'next legitimate attempt continues at saved place';
end $$;
reset role;
update typing_tests set started_at=now()-interval '61 seconds' where id in (select test_id from next_integrity_run);
set role authenticated;
do $$ begin
  perform public.finish_typing_test((select test_id from next_integrity_run),80,80,10);
  assert (select words from public.typing_progress where user_id=auth.uid() and text_id='sql-o-que-e')=20, 'legitimate next attempt advances';
end $$;
reset role;
rollback;
select 'TYPING INTEGRITY TESTS PASSED' as result;
