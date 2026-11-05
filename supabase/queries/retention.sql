-- Pacto — weekly retention of one group. Read-only: a single SELECT, safe to run in the SQL Editor
-- (it is not a migration and changes nothing). Needs 0018_membership_log.sql.
--
-- * Week N of a member = days joined_on + 7N … joined_on + 7N + 6 (counted from their own join day,
--   so late joiners are compared at the same age).
-- * Everyone who joined counts in every week that has started, including who left since (from
--   membership_log): someone who left is simply not active after leaving.
-- * active = at least one proof that week (any goal, extras included). kept = at least one complete day.
-- * ja_sairam = members of that week's row who had left before the week started. parcial = week still running.
-- * Blind spot: people who left before 0018 was run were not recorded and do not appear.
--
-- Group: set invite_code below; left null, it takes the group with the most members.

with params as (
  select null::text as invite_code
),
target as (
  select g.id, g.name
  from public.groups g
  left join public.members m on m.group_id = g.id
  where (select invite_code from params) is null or g.invite_code = upper((select invite_code from params))
  group by g.id
  order by count(m.user_id) desc, g.created_at
  limit 1
),
today as (
  select (now() at time zone 'America/Sao_Paulo')::date as d
),
roster as (
  select l.user_id, l.joined_on, l.left_on, l.active_weeks, l.kept_weeks
  from public.membership_log l
  where l.group_id = (select id from target)
),
weeks as (
  select r.*, n as week, r.joined_on + 7 * n as starts_on, r.joined_on + 7 * n + 6 as ends_on
  from roster r
  cross join lateral generate_series(0, ((select d from today) - r.joined_on) / 7) n
),
activity as (
  select w.week, w.ends_on, w.left_on is not null and w.left_on <= w.starts_on as gone,
    case when w.user_id is null then w.week = any (w.active_weeks)
      else exists (select 1 from public.checkins c where c.user_id = w.user_id and c.day between w.starts_on and w.ends_on) end as active,
    case when w.user_id is null then w.week = any (w.kept_weeks)
      else exists (select 1 from public.completed_days cd where cd.user_id = w.user_id and cd.day between w.starts_on and w.ends_on) end as kept
  from weeks w
)
select
  (select name from target) as grupo,
  a.week as semana,
  count(*) as membros,
  count(*) filter (where a.active) as ativos,
  round(100.0 * count(*) filter (where a.active) / count(*), 1) as ativos_pct,
  count(*) filter (where a.kept) as cumpriram_1_dia,
  round(100.0 * count(*) filter (where a.kept) / count(*), 1) as cumpriram_pct,
  count(*) filter (where a.gone) as ja_sairam,
  bool_or(a.ends_on >= (select d from today)) as parcial
from activity a
group by a.week
order by a.week;
