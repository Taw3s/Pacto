-- Retaking an annulled proof and extra study sessions (0007). Runs after chests_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Annuls a proof as if the group had voted (fixture, as superuser).
create or replace function pg_temp.annul(p_checkin uuid) returns void language plpgsql as $$
declare v_dispute uuid;
begin
  insert into public.disputes (checkin_id, reason, by_ai) values (p_checkin, 'Juiz IA: teste', true) returning id into v_dispute;
  alter table public.dispute_votes disable trigger dispute_votes_before_insert;
  insert into public.dispute_votes (dispute_id, voter_id, upheld, reason)
  select v_dispute, m.user_id, true, 'Culpado no teste' from public.members m
  where m.group_id = '00000000-0000-0000-0000-0000000000a1' and m.user_id <> '00000000-0000-0000-0000-000000000006';
  alter table public.dispute_votes enable trigger dispute_votes_before_insert;
  assert (select status from public.dispute_results where dispute_id = v_dispute) = 'upheld', 'fixture annulled the proof';
end $$;

insert into storage.objects (bucket_id, name)
select 'media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/' || n || '.jpg'
from unnest(array['t1', 't2', 't3', 's1', 's2', 'x1', 'x2', 'x3', 'r1']) n;

-- Fab (user 6) ----------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000006');
set role authenticated;
insert into public.checkins (goal, photo_path) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/t1.jpg');
do $$ begin
  -- The same goal twice in a day is still refused while the first proof stands.
  begin
    insert into public.checkins (goal, photo_path) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/t2.jpg');
    raise exception 'FAIL: second typing proof accepted';
  exception when unique_violation then null; end;
  -- Members never choose what a proof retakes.
  begin
    insert into public.checkins (goal, photo_path, retake_of)
    values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/t2.jpg', gen_random_uuid());
    raise exception 'FAIL: client set retake_of';
  exception when insufficient_privilege then null; end;
  -- Extra sessions are study only, and only after the study proof.
  begin
    insert into public.checkins (goal, photo_path, extra) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/x1.jpg', true);
    raise exception 'FAIL: extra typing session';
  exception when raise_exception then
    if sqlerrm not like '%only study%' then raise; end if;
  end;
  begin
    insert into public.checkins (goal, photo_path, minutes, extra) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/x1.jpg', 30, true);
    raise exception 'FAIL: extra session before the study proof';
  exception when raise_exception then
    if sqlerrm not like '%study proof first%' then raise; end if;
  end;
end $$;

insert into public.checkins (goal, photo_path, summary, minutes)
values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/s1.jpg', 'Estudei geometria analítica e cônicas hoje à tarde.', 60);
-- An extra session needs no summary, only minutes (>= 10).
insert into public.checkins (goal, photo_path, minutes, extra) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/x1.jpg', 30, true);
do $$ begin
  begin
    insert into public.checkins (goal, photo_path, minutes, extra) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/x2.jpg', 5, true);
    raise exception 'FAIL: 5-minute extra session';
  exception when check_violation then null; end;
  assert (select count(*) from public.checkins where user_id = auth.uid() and day = sp_today()) = 3, 'typing, study and one extra';
end $$;
insert into public.checkins (goal, photo_path, pages) values ('reading', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/r1.jpg', 12);
do $$ begin
  assert exists (select 1 from public.completed_days where user_id = auth.uid() and day = sp_today()), 'fab completed today';
end $$;
reset role;

-- The tribunal annuls the typing proof: the day is no longer complete, and Fab may retake it.
select pg_temp.annul((select id from public.checkins where photo_path like '%-000000000006/t1.jpg'));
select pg_temp.act_as('00000000-0000-0000-0000-000000000006');
set role authenticated;
do $$ begin
  assert not exists (select 1 from public.completed_days where user_id = auth.uid() and day = sp_today()), 'annulled typing breaks the day';
end $$;
insert into public.checkins (goal, photo_path) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/t2.jpg');
do $$ begin
  assert (select retake_of from public.checkins where photo_path like '%-000000000006/t2.jpg')
       = (select id from public.checkins where photo_path like '%-000000000006/t1.jpg'), 'retake points to the annulled proof';
  assert exists (select 1 from public.completed_days where user_id = auth.uid() and day = sp_today()), 'the retake completes the day again';
  -- The retake stands: no third typing proof.
  begin
    insert into public.checkins (goal, photo_path) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/t3.jpg');
    raise exception 'FAIL: retook a proof that was not annulled';
  exception when unique_violation then null; end;
end $$;
reset role;

-- An extra session never replaces an annulled study proof.
select pg_temp.annul((select id from public.checkins where photo_path like '%-000000000006/s1.jpg'));
select pg_temp.act_as('00000000-0000-0000-0000-000000000006');
set role authenticated;
do $$ begin
  assert not exists (select 1 from public.completed_days where user_id = auth.uid() and day = sp_today()), 'extra session does not count as the study goal';
  begin
    insert into public.checkins (goal, photo_path, minutes, extra) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/x3.jpg', 30, true);
    raise exception 'FAIL: extra session on an annulled study proof';
  exception when raise_exception then
    if sqlerrm not like '%study proof first%' then raise; end if;
  end;
end $$;
-- The study retake still needs the full proof (60 min + summary).
do $$ begin
  begin
    insert into public.checkins (goal, photo_path, minutes) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/s2.jpg', 60);
    raise exception 'FAIL: study retake without summary';
  exception when check_violation then null; end;
end $$;
insert into public.checkins (goal, photo_path, summary, minutes)
values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000006/s2.jpg', 'Refiz: listas de exercícios de cônicas com gabarito comentado.', 70);
do $$ begin
  assert exists (select 1 from public.completed_days where user_id = auth.uid() and day = sp_today()), 'study retake completes the day';
end $$;
reset role;

select 'RETAKE TESTS PASSED' as result;
