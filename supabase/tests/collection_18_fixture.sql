-- Openings made before 0027 (old ids, daily and weekly), then a snapshot of every opening, so
-- collection_18_test.sql can prove the migration changed none of them.
\set ON_ERROR_STOP on
insert into public.chest_openings (user_id, group_id, kind, period, item_id)
select m.user_id, m.group_id, k.kind, date '2030-01-07' + k.n, k.item
from (select user_id, group_id from public.members order by joined_on, user_id limit 1) m
cross join (values ('daily', 0, 'duck'), ('daily', 1, 'duck'), ('daily', 2, 'crown'), ('weekly', 0, 'cat')) k(kind, n, item);
create table public._openings_before_0027 as select id, user_id, group_id, kind, period, item_id, created_at from public.chest_openings;
do $$ begin assert (select count(*) from public._openings_before_0027) >= 4, 'fixture openings'; end $$;
