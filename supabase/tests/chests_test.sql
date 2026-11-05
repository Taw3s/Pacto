-- Chests, collection, weekly challenge and push tables (0006). Runs after ai_judge_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Ana completed today's 3 goals (rls_test): she opens one daily chest, once.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$
declare a record; b record;
begin
  select * into a from public.open_chest('daily');
  assert a.item_id is not null and not a.already, 'first opening gives an item';
  select * into b from public.open_chest('daily');
  assert b.item_id = a.item_id and b.already, 'second call returns the same item';
  assert (select count(*) from public.chest_openings where user_id = auth.uid()) = 1, 'one chest per day';
  begin
    insert into public.chest_openings (user_id, group_id, kind, period, item_id)
    values (auth.uid(), public.my_group_id(), 'daily', sp_today() - 1, 'crown');
    raise exception 'FAIL: member inserted a chest';
  exception when insufficient_privilege then null; end;
  begin
    perform public.open_chest('weekly');
    raise exception 'FAIL: weekly chest without the challenge';
  exception when raise_exception then
    if sqlerrm not like '%weekly challenge not complete%' then raise; end if;
  end;
  begin
    perform public.open_chest('mega');
    raise exception 'FAIL: unknown chest';
  exception when raise_exception then
    if sqlerrm not like '%invalid chest%' then raise; end if;
  end;
end $$;
reset role;

-- Bia did not complete today: no chest. Everyone in the group sees Ana's collection.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  begin
    perform public.open_chest('daily');
    raise exception 'FAIL: chest without completing the day';
  exception when raise_exception then
    if sqlerrm not like '%day not complete%' then raise; end if;
  end;
  assert (select count(*) from public.chest_openings) = 1, 'group reads chests';
  assert (select count(*) from public.my_weekly_progress()) >= 6, 'week progress lists the members';
end $$;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000010');
set role authenticated;
do $$ begin
  assert (select count(*) from public.chest_openings) = 0, 'other group cannot read chests';
end $$;
reset role;

-- The draw follows the weights: over many draws commons win most and legendaries are rare.
do $$
declare n_common int := 0; n_legend int := 0; r text;
begin
  for i in 1..4000 loop
    select c.rarity into r from public.collectibles c order by -ln(1 - random()) / c.weight limit 1;
    if r = 'comum' then n_common := n_common + 1; elsif r = 'lendario' then n_legend := n_legend + 1; end if;
  end loop;
  assert n_common between 2160 and 2640, format('commons %s (expected ~60%%)', n_common);
  assert n_legend between 260 and 540, format('legendaries %s (expected ~10%%)', n_legend);
end $$;

-- Weekly challenge on a fixed Saturday (test-only override of the clock): everyone who was in
-- the group on Monday completes 5 days -> each opens one rare-or-better chest.
create or replace function public.sp_today() returns date language sql stable as $$ select date '2030-06-08' $$;
update public.members set joined_on = date '2030-05-01';
alter table public.checkins disable trigger checkins_before_insert;
insert into public.checkins (user_id, group_id, day, goal, photo_path, summary, minutes, pages)
select m.user_id, m.group_id, d::date, g::public.goal, m.group_id || '/' || m.user_id || '/w-' || d::date || '-' || g || '.jpg',
       case when g = 'study' then 'Resumo de teste com mais de quarenta caracteres, para o desafio.' end,
       case when g = 'study' then 60 end, case when g = 'reading' then 10 end
from public.members m
cross join generate_series(date '2030-06-03', date '2030-06-06', interval '1 day') d
cross join unnest(array['study', 'typing', 'reading']) g
where m.group_id = '00000000-0000-0000-0000-0000000000a1';
alter table public.checkins enable trigger checkins_before_insert;

select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  -- 4 of 5 days: not yet.
  begin
    perform public.open_chest('weekly');
    raise exception 'FAIL: weekly chest with 4 days';
  exception when raise_exception then
    if sqlerrm not like '%weekly challenge not complete%' then raise; end if;
  end;
end $$;
reset role;

alter table public.checkins disable trigger checkins_before_insert;
insert into public.checkins (user_id, group_id, day, goal, photo_path, summary, minutes, pages)
select m.user_id, m.group_id, date '2030-06-07', g::public.goal, m.group_id || '/' || m.user_id || '/w-2030-06-07-' || g || '.jpg',
       case when g = 'study' then 'Resumo de teste com mais de quarenta caracteres, para o desafio.' end,
       case when g = 'study' then 60 end, case when g = 'reading' then 10 end
from public.members m cross join unnest(array['study', 'typing', 'reading']) g
where m.group_id = '00000000-0000-0000-0000-0000000000a1';
alter table public.checkins enable trigger checkins_before_insert;

select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$
declare w record;
begin
  select * into w from public.open_chest('weekly');
  assert w.rarity in ('raro', 'lendario'), format('weekly chest is rare or better, got %s', w.rarity);
  assert (select count(*) from public.chest_openings where kind = 'weekly' and user_id = auth.uid()) = 1, 'one weekly chest';
end $$;
reset role;

create or replace function public.sp_today() returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- Push: members manage only their own subscriptions; keys and the log are server-only.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/bia', 'k', 'a');
do $$ begin
  assert (select user_id from public.push_subscriptions) = auth.uid(), 'subscription belongs to the caller';
  begin
    insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values ('00000000-0000-0000-0000-000000000001', 'https://push.example/fake', 'k', 'a');
    raise exception 'FAIL: subscribed someone else';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.push_config;
    raise exception 'FAIL: member read VAPID keys';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.notification_log;
    raise exception 'FAIL: member read the notification log';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
do $$ begin
  assert (select count(*) from public.push_subscriptions) = 0, 'cannot see other subscriptions';
end $$;
reset role;

-- The server logs notices with kinds like 'nudge:<user id>' (42 characters): they must fit.
set role service_role;
insert into public.notification_log (user_id, kind, day)
values ('00000000-0000-0000-0000-000000000002', 'nudge:00000000-0000-0000-0000-000000000001', sp_today());
reset role;

select 'CHEST TESTS PASSED' as result;
