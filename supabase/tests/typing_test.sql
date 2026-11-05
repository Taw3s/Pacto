-- Typing test inside the app (0010). Runs after reactions_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

insert into storage.objects (bucket_id, name) values
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/card1.jpg'),
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/card2.jpg');

-- Caio (user 3), starting today without a typing proof (earlier test files gave him one).
delete from public.checkins where user_id = '00000000-0000-0000-0000-000000000003' and goal = 'typing' and day = sp_today();
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
set role authenticated;
do $$
declare t1 uuid; s int; r record;
begin
  -- A typing photo without a test is no longer accepted.
  begin
    insert into public.checkins (goal, photo_path) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/card1.jpg');
    raise exception 'FAIL: typing without a test';
  exception when raise_exception then
    if sqlerrm not like '%finished test%' then raise; end if;
  end;
  -- Members cannot write tests directly.
  begin
    insert into public.typing_tests (user_id, group_id, day, device, seconds)
    values (auth.uid(), public.my_group_id(), sp_today(), 'pc', 60);
    raise exception 'FAIL: wrote a test row';
  exception when insufficient_privilege then null; end;
  select test_id, seconds into t1, s from public.start_typing_test('pc');
  assert s = 60, 'tests last 60 seconds';
  -- Finishing right away (faked clock) is refused.
  begin
    perform public.finish_typing_test(t1, 300, 310);
    raise exception 'FAIL: finished too early';
  exception when raise_exception then
    if sqlerrm not like '%timing%' then raise; end if;
  end;
end $$;
reset role;

-- One minute later (moved back as superuser): the server computes the result.
update public.typing_tests set started_at = now() - interval '61 seconds' where user_id = '00000000-0000-0000-0000-000000000003';
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
set role authenticated;
do $$
declare t1 uuid := (select id from public.typing_tests where user_id = auth.uid()); r record;
begin
  -- 2000 correct characters in a minute is 400 wpm: implausible.
  begin
    perform public.finish_typing_test(t1, 1400, 1450);
    raise exception 'FAIL: implausible result accepted';
  exception when raise_exception then
    if sqlerrm not like '%implausible%' then raise; end if;
  end;
  begin
    perform public.finish_typing_test(t1, 50, 40);
    raise exception 'FAIL: more correct than typed';
  exception when raise_exception then
    if sqlerrm not like '%invalid result%' then raise; end if;
  end;
  select * into r from public.finish_typing_test(t1, 300, 320);
  assert r.wpm = 60 and r.accuracy = 0.938 and r.score = 56.3, format('result %s', r);
  begin
    perform public.finish_typing_test(t1, 300, 320);
    raise exception 'FAIL: finished twice';
  exception when raise_exception then
    if sqlerrm not like '%already finished%' then raise; end if;
  end;
  -- The check-in points to the finished test.
  insert into public.checkins (goal, photo_path, typing_test_id)
  values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/card1.jpg', t1);
  assert exists (select 1 from public.checkins where typing_test_id = t1), 'typing check-in saved';
  -- Two more attempts, then no more today.
  perform public.start_typing_test('mobile');
  perform public.start_typing_test('pc');
  begin
    perform public.start_typing_test('pc');
    raise exception 'FAIL: fourth attempt';
  exception when raise_exception then
    if sqlerrm not like '%no attempts left%' then raise; end if;
  end;
  begin
    perform public.start_typing_test('tablet');
    raise exception 'FAIL: unknown device';
  exception when raise_exception then
    if sqlerrm not like '%invalid device%' and sqlerrm not like '%no attempts left%' then raise; end if;
  end;
end $$;
reset role;

-- Someone else's test cannot be finished or used.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  begin
    perform public.finish_typing_test((select id from public.typing_tests where device = 'mobile' limit 1), 10, 10);
    raise exception 'FAIL: finished another person''s test';
  exception when raise_exception then
    if sqlerrm not like '%not found%' then raise; end if;
  end;
  assert (select count(*) from public.typing_tests) = 3, 'the group sees the tests';
end $$;
reset role;

select 'TYPING TESTS PASSED' as result;
