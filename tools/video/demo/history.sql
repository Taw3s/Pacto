-- History of the demo group, run after everyone signed up: all joined 3 days ago and did the 3 goals
-- on each past day, except Bruno yesterday (his debt: the default menu, 1 Coca + 1 salgado).
\set ON_ERROR_STOP on

update public.groups set owner_id = (select user_id from public.members where display_name = 'Ana') where invite_code = 'DEMO2026';
update public.members set joined_on = public.sp_today() - 3;
update public.day_off_changes d set effective_from = m.joined_on from public.members m where m.user_id = d.user_id;

alter table public.checkins disable trigger user;
insert into public.checkins (user_id, group_id, day, goal, photo_path, summary, minutes, pages)
select m.user_id, m.group_id, d::date, g::public.goal,
       m.group_id || '/' || m.user_id || '/demo-' || d::date || '-' || g || '.jpg',
       case when g = 'study' then 'Revisão de funções do 2º grau com exercícios do capítulo 3.' end,
       case when g = 'study' then 90 end,
       case when g = 'reading' then 25 end
from public.members m
cross join generate_series(public.sp_today() - 3, public.sp_today() - 1, interval '1 day') d
cross join unnest(array['study', 'typing', 'reading']) g
where not (m.display_name = 'Bruno' and d::date = public.sp_today() - 1);
alter table public.checkins enable trigger user;
