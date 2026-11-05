-- Collection expansion (0027). Runs after the migration, applied twice by run.sh (it must be idempotent).
\set ON_ERROR_STOP on

-- Catalog: 18 objects, 6 per rarity, one weight per rarity.
do $$ begin
  assert (select count(*) from public.collectibles) = 18, 'eighteen objects';
  assert (select count(*) from public.collectibles where rarity = 'comum' and weight = 30) = 6, 'six commons of weight 30';
  assert (select count(*) from public.collectibles where rarity = 'raro' and weight = 15) = 6, 'six rares of weight 15';
  assert (select count(*) from public.collectibles where rarity = 'lendario' and weight = 5) = 6, 'six legendaries of weight 5';
  assert (select count(*) from public.collectibles where id in
          ('forgottenCoffee', 'survivorPencil', 'patchedHeadphones', 'crookedHourglass', 'suspiciousLoupe', 'witnessPigeon',
           'judgeSlippers', 'rubberGavel', 'goldenJudgeBust', 'magistrateDuck')) = 10, 'the ten new ids';
end $$;

-- The odds, exactly (integer arithmetic, no sampling): the open_chest draw is weighted by these sums.
do $$
declare c int; r int; l int;
begin
  select sum(weight) filter (where rarity = 'comum'), sum(weight) filter (where rarity = 'raro'), sum(weight) filter (where rarity = 'lendario')
    into c, r, l from public.collectibles;
  assert (c, r, l) = (180, 90, 30), format('weight sums %s/%s/%s', c, r, l);
  -- Daily chest: 60% / 30% / 10%.
  assert c * 10 = (c + r + l) * 6 and r * 10 = (c + r + l) * 3 and l * 10 = (c + r + l), 'daily 60/30/10';
  -- Weekly chest (no commons): 75% / 25%.
  assert r * 4 = (r + l) * 3 and l * 4 = (r + l), 'weekly 75/25';
  -- Each object: common 30/300 = 10%, rare 15/300 = 5%, legendary 5/300 = 1/60 daily; legendary 5/120 = 1/24 weekly.
  assert (c + r + l) = 300 and (r + l) = 120, 'totals 300 daily and 120 weekly';
end $$;

-- No opening was added, removed or changed.
do $$ begin
  assert (select count(*) from public.chest_openings) = (select count(*) from public._openings_before_0027), 'same number of openings';
  assert not exists (
    (select id, user_id, group_id, kind, period, item_id, created_at from public.chest_openings)
    except
    (select * from public._openings_before_0027)
  ), 'openings unchanged';
end $$;
drop table public._openings_before_0027;

-- Members still cannot write the catalog or pick an item.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
set role authenticated;
do $$ begin
  assert (select count(*) from public.collectibles) = 18, 'members read the whole catalog';
  begin
    update public.collectibles set weight = 1000 where id = 'magistrateDuck';
    raise exception 'FAIL: member changed a weight';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.collectibles (id, rarity, weight) values ('mine', 'lendario', 1000);
    raise exception 'FAIL: member added an object';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.chest_openings (user_id, group_id, kind, period, item_id)
    values (auth.uid(), public.my_group_id(), 'daily', sp_today() - 3, 'magistrateDuck');
    raise exception 'FAIL: member chose a reward';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Every object of the catalog can come out of the draw used by open_chest (weekly: never a common).
do $$
declare seen text[];
begin
  -- The draw references the series row, so Postgres runs it once per row instead of once in total.
  select array_agg(distinct d.id) into seen from generate_series(1, 20000) g(i)
  cross join lateral (select c.id from public.collectibles c where g.i > 0 order by -ln(1 - random()) / c.weight limit 1) d;
  assert cardinality(seen) = 18, format('only %s objects drawn in 20000 tries', cardinality(seen));
  assert not exists (
    select 1 from generate_series(1, 2000) g(i)
    cross join lateral (select c.rarity from public.collectibles c where g.i > 0 and c.rarity <> 'comum' order by -ln(1 - random()) / c.weight limit 1) w
    where w.rarity = 'comum'
  ), 'weekly draw has no commons';
end $$;

select 'COLLECTION 18 TESTS PASSED' as result;
