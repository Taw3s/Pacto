-- History for stages d–h, relative to today (see e2e/dates.mjs). Runs after stages a–c.
\set ON_ERROR_STOP on

-- Everyone joined 6 days ago (a day off); Caio on the 20th of last month (his debts are overdue).
update public.members set joined_on = public.sp_today() - 6;
update public.members set joined_on = (date_trunc('month', public.sp_today()) - interval '1 month' + interval '19 days')::date
  where display_name = 'Caio';
update public.day_off_changes d set effective_from = m.joined_on from public.members m where m.user_id = d.user_id;

-- Ana did the 3 goals on each of the 5 days before today; Bia only 3 days ago.
alter table public.checkins disable trigger user;
insert into public.checkins (user_id, group_id, day, goal, photo_path, summary, minutes, pages)
select m.user_id, m.group_id, d::date, g::public.goal,
       m.group_id || '/' || m.user_id || '/seed-' || d::date || '-' || g || '.jpg',
       case when g = 'study' then 'Resumo de seed com mais de quarenta caracteres para o teste.' end,
       case when g = 'study' then 90 end,
       case when g = 'reading' then 20 end
from public.members m
cross join generate_series(public.sp_today() - 5, public.sp_today() - 1, interval '1 day') d
cross join unnest(array['study', 'typing', 'reading']) g
where m.display_name = 'Ana' or (m.display_name = 'Bia' and d::date = public.sp_today() - 3);
alter table public.checkins enable trigger user;
