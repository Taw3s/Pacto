-- Business-rule and RLS tests. Any failed assertion aborts with an error.
\set ON_ERROR_STOP on

-- Fixtures (as superuser) ---------------------------------------------------
insert into public.groups (id, name, invite_code) values
  ('00000000-0000-0000-0000-0000000000a1', 'Pacto', 'PACTO123'),
  ('00000000-0000-0000-0000-0000000000b2', 'Outro', 'OUTRO123');

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'ana@x.com',  '{"invite_code":" pacto123 ","display_name":"Ana"}'),
  ('00000000-0000-0000-0000-000000000002', 'bia@x.com',  '{"invite_code":"PACTO123","display_name":"Bia"}'),
  ('00000000-0000-0000-0000-000000000003', 'caio@x.com', '{"invite_code":"PACTO123"}'),
  ('00000000-0000-0000-0000-000000000004', 'davi@x.com', '{"invite_code":"PACTO123","display_name":"Davi"}'),
  ('00000000-0000-0000-0000-000000000005', 'eva@x.com',  '{"invite_code":"PACTO123","display_name":"Eva"}'),
  ('00000000-0000-0000-0000-000000000006', 'fab@x.com',  '{"invite_code":"PACTO123","display_name":"Fab"}'),
  ('00000000-0000-0000-0000-000000000009', 'intruso@x.com', '{"invite_code":"ERRADO"}'),
  ('00000000-0000-0000-0000-000000000010', 'outro@x.com', '{"invite_code":"OUTRO123","display_name":"Outro"}');

do $$ begin
  assert (select count(*) from public.members where group_id = '00000000-0000-0000-0000-0000000000a1') = 6, 'six members joined';
  assert not exists (select 1 from public.members where user_id = '00000000-0000-0000-0000-000000000009'), 'bad code -> no membership';
  assert (select display_name from public.members where user_id = '00000000-0000-0000-0000-000000000003') = 'caio', 'name falls back to email';
  assert (select weekday from public.day_off_changes where user_id = '00000000-0000-0000-0000-000000000001') = 0, 'default day off sunday';
end $$;

-- Backdate membership so past days exist, and seed a past check-in (as superuser, bypassing triggers).
update public.members set joined_on = sp_today() - 10;
alter table public.checkins disable trigger checkins_before_insert;
insert into public.checkins (id, user_id, group_id, day, goal, photo_path, summary) values
  ('00000000-0000-0000-0000-00000000c0d1', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1',
   sp_today() - 5, 'typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000002/old.jpg', null);
alter table public.checkins enable trigger checkins_before_insert;

-- Helper to act as a user
create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Ana (user 1) --------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;

do $$ begin
  assert (select count(*) from public.members) = 6, 'ana sees only her group';
  assert (select count(*) from public.groups) = 1, 'ana sees one group';
end $$;

-- Photos are uploaded before the check-in (PAC-01)
insert into storage.objects (bucket_id, name) values
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/s.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/t.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/r.jpg'),
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/t2.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/z.jpg');

-- Must fail: check-in pointing to a photo that was never uploaded (PAC-01)
do $$ begin
  begin
    insert into public.checkins (goal, photo_path) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/nunca-enviada.jpg');
    raise exception 'FAIL: missing photo accepted';
  exception when raise_exception then
    if sqlerrm not like '%photo not uploaded%' then raise; end if;
  end;
end $$;

-- client-chosen day / user are overwritten by the trigger
insert into public.checkins (goal, photo_path, summary, minutes) values
  ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/s.jpg',
   'Estudei integrais por partes e substituição trigonométrica hoje.', 75);
insert into public.checkins (goal, photo_path) values
  ('typing',  '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/t.jpg');
insert into public.checkins (goal, photo_path, pages) values
  ('reading', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/r.jpg', 18);

do $$ begin
  assert (select count(*) from public.completed_days where user_id = '00000000-0000-0000-0000-000000000001' and day = sp_today()) = 1, 'ana completed today';
end $$;

-- Must fail: passing day explicitly (no column grant)
do $$ begin
  begin
    insert into public.checkins (goal, photo_path, day) values ('study', 'x', sp_today() - 1);
    raise exception 'FAIL: day column accepted';
  exception when insufficient_privilege then null; end;
end $$;

-- Must fail: short study summary
do $$ begin
  begin
    insert into public.checkins (goal, photo_path, summary, minutes) values ('study',
      '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/z.jpg', 'curto', 60);
    raise exception 'FAIL: short summary accepted';
  exception when check_violation then null; end;
end $$;

-- Must fail: duplicated goal on the same day
do $$ begin
  begin
    insert into public.checkins (goal, photo_path) values ('typing',
      '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000001/t2.jpg');
    raise exception 'FAIL: duplicate accepted';
  exception when unique_violation then null; end;
end $$;

-- Must fail: photo in someone else's folder
do $$ begin
  begin
    insert into public.checkins (goal, photo_path) values ('typing',
      '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000002/t.jpg');
    raise exception 'FAIL: foreign photo path accepted';
  exception when raise_exception then
    if sqlerrm not like '%invalid photo path%' and sqlerrm not like '%duplicate%' then raise; end if;
  end;
end $$;

-- Must fail: update / delete a proof
do $$ begin
  begin
    update public.checkins set summary = 'x' where user_id = auth.uid();
    raise exception 'FAIL: update allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.checkins where user_id = auth.uid();
    raise exception 'FAIL: delete allowed';
  exception when insufficient_privilege then null; end;
end $$;

-- Must fail: cannot change own joined_on / group
do $$ begin
  begin
    update public.members set joined_on = sp_today() where user_id = auth.uid();
    raise exception 'FAIL: joined_on update allowed';
  exception when insufficient_privilege then null; end;
end $$;
update public.members set display_name = '   Ana Clara   ' where user_id = auth.uid();
do $$ begin
  assert (select display_name from public.members where user_id = auth.uid()) = 'Ana Clara', 'name trimmed (PAC-06)';
  begin
    update public.members set display_name = repeat('a', 41) where user_id = auth.uid();
    raise exception 'FAIL: 41-char name accepted';
  exception when check_violation then null; end;
end $$;

-- Storage policies
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values
      ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000002/hack.jpg');
    raise exception 'FAIL: upload to foreign folder';
  exception when insufficient_privilege then null; end;
end $$;

-- Day off changes take effect next Monday, one choice per week (PAC-02)
select public.set_day_off(5::smallint);
select public.set_day_off(3::smallint);
do $$
declare nm date := public.next_monday(sp_today());
begin
  assert extract(isodow from nm) = 1 and nm > sp_today() and nm <= sp_today() + 7, 'next monday';
  assert public.day_off_for(auth.uid(), sp_today()) = 0, 'this week keeps sunday';
  assert public.day_off_for(auth.uid(), nm - 1) = 0, 'until sunday keeps sunday';
  assert public.day_off_for(auth.uid(), nm) = 3, 'from next monday: wednesday';
  assert (select count(*) from public.day_off_changes where user_id = auth.uid() and effective_from > sp_today()) = 1,
    'one choice per week';
  -- Requests on any day of a week land on the same Monday: at most one change per Mon–Sun week.
  for i in 0..20 loop
    assert public.next_monday(date '2026-10-19' + i) = date '2026-10-26' + 7 * (i / 7), 'monday for day ' || i;
  end loop;
end $$;

-- Must fail: Ana cannot mark her own debt
do $$ begin
  begin
    insert into public.payments (debtor_id, day, item) values (auth.uid(), sp_today() - 1, 'coke');
    raise exception 'FAIL: self payment';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

reset role;

-- Bia (user 2) checks in; Ana disputes ------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
insert into storage.objects (bucket_id, name) values ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000002/t.jpg');
insert into public.checkins (goal, photo_path) values
  ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000002/t.jpg');
-- Must fail: the same photo proving a second goal (PAC-01)
do $$ begin
  begin
    insert into public.checkins (goal, photo_path, pages) values ('reading', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000002/t.jpg', 10);
    raise exception 'FAIL: photo reused';
  exception when unique_violation then null; end;
end $$;
-- Bia cannot dispute her own
do $$ begin
  begin
    insert into public.disputes (checkin_id, reason)
    select id, 'auto contestação' from public.checkins where user_id = auth.uid() and day = sp_today();
    raise exception 'FAIL: self dispute';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
insert into public.disputes (checkin_id, reason)
select id, 'Foto da tela está desligada' from public.checkins
where user_id = '00000000-0000-0000-0000-000000000002' and day = sp_today();

-- Old check-in (5 days ago) cannot be disputed anymore
do $$ begin
  begin
    insert into public.disputes (checkin_id, reason) values ('00000000-0000-0000-0000-00000000c0d1', 'muito antigo isso');
    raise exception 'FAIL: old dispute';
  exception when raise_exception then
    if sqlerrm not like '%window closed%' then raise; end if;
  end;
end $$;

do $$ begin
  assert (select status from public.dispute_results) = 'open', 'open after 1 vote';
  assert (select yes from public.dispute_results) = 1, 'author vote counted';
  assert (select eligible from public.dispute_results) = 5, '5 eligible';
end $$;
-- Ana cannot vote twice
do $$ begin
  begin
    insert into public.dispute_votes (dispute_id, upheld) select dispute_id, true from public.dispute_results;
    raise exception 'FAIL: double vote';
  exception when unique_violation then null; end;
end $$;
reset role;

-- Bia replies once, cannot vote
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
update public.disputes set reply = 'Era o monitor secundário';
do $$ begin
  assert (select replied_at from public.disputes) is not null, 'replied_at set';
  begin
    update public.disputes set reply = 'mudei';
    raise exception 'FAIL: second reply';
  exception when raise_exception then
    if sqlerrm not like '%already replied%' then raise; end if;
  end;
  begin
    insert into public.dispute_votes (dispute_id, upheld) select id, false from public.disputes;
    raise exception 'FAIL: owner voted';
  exception when raise_exception then
    if sqlerrm not like '%owner cannot vote%' then raise; end if;
  end;
end $$;
reset role;

-- Caio (3) cannot reply (not owner): update affects 0 rows
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
set role authenticated;
do $$ declare n int; begin
  update public.disputes set reply = 'hack';
  get diagnostics n = row_count;
  assert n = 0, 'non-owner reply blocked';
end $$;
insert into public.dispute_votes (dispute_id, upheld) select id, true from public.disputes;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
set role authenticated;
insert into public.dispute_votes (dispute_id, upheld) select id, true from public.disputes;
do $$ begin
  assert (select status from public.dispute_results) = 'upheld', 'upheld with 3 of 5';
end $$;
reset role;

-- A new member joins after the verdict: it must not reopen, and they cannot vote (PAC-03)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000007', 'gil@x.com', '{"invite_code":"PACTO123","display_name":"Gil"}');
do $$ begin
  assert (select status from public.dispute_results) = 'upheld', 'still upheld after a new member';
  assert (select eligible from public.dispute_results) = 5, 'electorate frozen at 5';
  assert (select count(*) from public.completed_days where user_id = '00000000-0000-0000-0000-000000000002') = 0,
    'annulled day stays annulled';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-000000000007');
set role authenticated;
do $$ begin
  begin
    insert into public.dispute_votes (dispute_id, upheld) select id, false from public.disputes;
    raise exception 'FAIL: late member voted';
  exception when raise_exception then
    if sqlerrm not like '%joined after%' then raise; end if;
  end;
end $$;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
set role authenticated;
do $$ begin
  begin
    insert into public.dispute_votes (dispute_id, upheld) select id, false from public.disputes;
    raise exception 'FAIL: vote on closed dispute';
  exception when raise_exception then
    if sqlerrm not like '%dispute closed%' then raise; end if;
  end;
end $$;
reset role;

-- Payments ---------------------------------------------------------------------
-- Eva marks Bia's coke for 3 days ago (missed day unless it was a Sunday)
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
set role authenticated;
do $$
declare d date := sp_today() - 3;
begin
  if extract(dow from d) = 0 then d := d - 1; end if;
  insert into public.payments (debtor_id, day, item) values ('00000000-0000-0000-0000-000000000002', d, 'coke');
  assert (select received_by from public.payments) = '00000000-0000-0000-0000-000000000005', 'receiver forced';
  begin
    insert into public.payments (debtor_id, day, item) values ('00000000-0000-0000-0000-000000000002', sp_today(), 'snack');
    raise exception 'FAIL: today payable';
  exception when raise_exception then
    if sqlerrm not like '%not payable%' then raise; end if;
  end;
  begin
    -- the most recent Sunday before today (default day off) is not payable
    insert into public.payments (debtor_id, day, item)
    values ('00000000-0000-0000-0000-000000000002', sp_today() - 1 - extract(dow from sp_today() - 1)::int, 'snack');
    raise exception 'FAIL: day off payable';
  exception when raise_exception then
    if sqlerrm not like '%day off%' then raise; end if;
  end;
  begin
    insert into public.payments (debtor_id, day, item) values ('00000000-0000-0000-0000-000000000002', d, 'coke');
    raise exception 'FAIL: double payment';
  exception when unique_violation then null; end;
end $$;
reset role;

-- Isolation: user from another group sees nothing of group A --------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000010');
set role authenticated;
do $$ begin
  assert (select count(*) from public.checkins) = 0, 'other group sees no checkins';
  assert (select count(*) from public.members) = 1, 'other group sees only itself';
  assert (select count(*) from public.disputes) = 0, 'no disputes';
  assert (select count(*) from public.payments) = 0, 'no payments';
  assert (select count(*) from storage.objects) = 0, 'no media';
  -- Ana's real choice from next Monday is Wednesday (3); other groups only get the default (PAC-05)
  assert public.day_off_for('00000000-0000-0000-0000-000000000001', public.next_monday(sp_today())) = 0,
    'day_off_for leaks across groups';
end $$;
reset role;

-- Intruder (no membership) sees nothing and cannot write -----------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000009');
set role authenticated;
do $$ begin
  assert (select count(*) from public.members) = 0, 'intruder sees no members';
  begin
    insert into public.checkins (goal, photo_path) values ('typing', 'a/b/c.jpg');
    raise exception 'FAIL: intruder insert';
  exception when raise_exception then
    if sqlerrm not like '%not a member%' then raise; end if;
  end;
end $$;
-- ...but can join with a valid code
select public.join_group('pacto123', 'Intruso Convidado');
do $$ begin
  assert (select count(*) from public.members) = 8, 'joined with code';
end $$;
reset role;

-- Anonymous: only the invite check
select pg_temp.act_as(null);
set role anon;
do $$ begin
  assert public.check_invite_code('pacto123'), 'code valid';
  assert not public.check_invite_code('nope'), 'code invalid';
  begin
    perform count(*) from public.members;
    raise exception 'FAIL: anon read';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Ranking numbers and projects (0003) -------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
set role authenticated;
insert into storage.objects (bucket_id, name) values
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/s.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/r.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/t.jpg'),
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/p1.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/p2.jpg'), ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/p0.jpg');
do $$ begin
  begin
    insert into public.checkins (goal, photo_path, summary, minutes) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/s.jpg',
      'Resumo com mais de quarenta caracteres para o teste de minutos.', 59);
    raise exception 'FAIL: 59 minutes accepted';
  exception when check_violation then null; end;
  begin
    insert into public.checkins (goal, photo_path, summary) values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/s.jpg',
      'Resumo com mais de quarenta caracteres para o teste de minutos.');
    raise exception 'FAIL: study without minutes accepted';
  exception when check_violation then null; end;
  begin
    insert into public.checkins (goal, photo_path) values ('reading', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/r.jpg');
    raise exception 'FAIL: reading without pages accepted';
  exception when check_violation then null; end;
  begin
    insert into public.checkins (goal, photo_path, title) values ('project', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/p0.jpg', ' x ');
    raise exception 'FAIL: project without title accepted';
  exception when check_violation then null; end;
end $$;
-- Fields that don't belong to the goal are dropped
insert into public.checkins (goal, photo_path, pages, minutes, title) values ('typing', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/t.jpg', 50, 300, 'hack');
insert into public.checkins (goal, photo_path, title, minutes) values ('project', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/p1.jpg', '  Calculadora em Python  ', 500);
do $$ begin
  assert (select pages is null and minutes is null and title is null from public.checkins where goal = 'typing' and user_id = auth.uid()),
    'typing keeps no numbers';
  assert (select title = 'Calculadora em Python' and minutes is null from public.checkins where goal::text = 'project' and user_id = auth.uid()),
    'project title trimmed, minutes dropped';
  begin
    insert into public.checkins (goal, photo_path, title) values ('project', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000003/p2.jpg', 'Segundo projeto');
    raise exception 'FAIL: two projects in a day';
  exception when unique_violation then null; end;
end $$;
reset role;

-- A project never replaces a daily goal: Caio has typing + project only
do $$ begin
  assert not exists (select 1 from public.completed_days where user_id = '00000000-0000-0000-0000-000000000003'),
    'project counted as a daily goal';
  assert (select count(*) from public.completed_days where user_id = '00000000-0000-0000-0000-000000000001' and day = sp_today()) = 1,
    'ana still complete';
end $$;

-- AI reviews (0004): only the server (service_role) writes, members of the group read ---------
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  begin
    insert into public.checkin_reviews (checkin_id, group_id, verdict, seen, model)
    select id, group_id, 'match', 'forjado', 'fake' from public.checkins where user_id = auth.uid() limit 1;
    raise exception 'FAIL: member forged an AI review';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
insert into public.checkin_reviews (checkin_id, group_id, verdict, seen, detected, model)
select id, group_id, 'mismatch', 'Foto de um gato, não de estudo', null, 'gemini-test'
from public.checkins where goal = 'typing' and user_id = '00000000-0000-0000-0000-000000000002' and day = sp_today();
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  assert (select count(*) from public.checkin_reviews) = 1, 'group member reads the review';
  begin
    update public.checkin_reviews set verdict = 'match';
    raise exception 'FAIL: member edited an AI review';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000010');
set role authenticated;
do $$ begin
  assert (select count(*) from public.checkin_reviews) = 0, 'other group cannot read reviews';
end $$;
reset role;

select 'ALL SQL TESTS PASSED' as result;
