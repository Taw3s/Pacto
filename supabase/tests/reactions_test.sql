-- Photo date and reactions (0009). Runs after photos_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

insert into storage.objects (bucket_id, name) values
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000005/d1.jpg'),
  ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000005/d2.jpg');

-- Eva: the phone's date is kept when in the past, dropped when in the future.
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
set role authenticated;
insert into public.checkins (goal, photo_path, summary, minutes, photo_taken_at)
values ('study', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000005/d1.jpg',
        'Estudei estatística: médias, variância e desvio padrão hoje.', 60, now() - interval '3 days');
insert into public.checkins (goal, photo_path, title, photo_taken_at)
values ('project', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000005/d2.jpg', 'Site novo', now() + interval '2 days');
do $$ begin
  assert (select photo_taken_at < now() - interval '2 days' from public.checkins where photo_path like '%/d1.jpg'), 'past date kept';
  assert (select photo_taken_at is null from public.checkins where photo_path like '%/d2.jpg'), 'future date dropped';
  -- Nobody reacts to their own proof.
  begin
    insert into public.checkin_reactions (checkin_id, kind) select id, 'respeito' from public.checkins where photo_path like '%/d1.jpg';
    raise exception 'FAIL: reacted to own proof';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Ana reacts to Eva's study proof: once per kind, an unknown kind is refused, she can undo it.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
insert into public.checkin_reactions (checkin_id, kind) select id, 'respeito' from public.checkins where photo_path like '%/d1.jpg';
insert into public.checkin_reactions (checkin_id, kind) select id, 'lenda' from public.checkins where photo_path like '%/d1.jpg';
do $$ begin
  begin
    insert into public.checkin_reactions (checkin_id, kind) select id, 'respeito' from public.checkins where photo_path like '%/d1.jpg';
    raise exception 'FAIL: same reaction twice';
  exception when unique_violation then null; end;
  begin
    insert into public.checkin_reactions (checkin_id, kind) select id, 'mentiroso' from public.checkins where photo_path like '%/d1.jpg';
    raise exception 'FAIL: unknown reaction';
  exception when check_violation then null; end;
  begin
    insert into public.checkin_reactions (checkin_id, user_id, kind)
    select id, '00000000-0000-0000-0000-000000000002', 'monstro' from public.checkins where photo_path like '%/d1.jpg';
    raise exception 'FAIL: reacted as someone else';
  exception when insufficient_privilege then null; end;
  delete from public.checkin_reactions where kind = 'lenda';
  assert (select count(*) from public.checkin_reactions) = 1, 'own reaction removed';
end $$;
reset role;

-- The group sees reactions; another group does not.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  assert (select count(*) from public.checkin_reactions) = 1, 'group reads reactions';
  delete from public.checkin_reactions;
  assert (select count(*) from public.checkin_reactions) = 1, 'cannot remove someone else''s reaction';
end $$;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000010');
set role authenticated;
do $$ begin
  assert (select count(*) from public.checkin_reactions) = 0, 'other group cannot read reactions';
end $$;
reset role;

select 'REACTIONS TESTS PASSED' as result;
