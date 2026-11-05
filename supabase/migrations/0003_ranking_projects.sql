-- Pacto — ranking numbers and projects. Run once, after 0002_security_fixes.sql.
--
--   * study check-ins record minutes (>= 60), reading check-ins record pages (>= 1)
--   * new goal 'project': optional, at most one per day, with a short title
--   * check-ins are allowed on the day off (they score in the ranking, nothing is required)
-- The ranking itself is computed in src/lib/ranking.ts (no stored scores, no cron).

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'disputes' and column_name = 'eligible'
  ) then
    raise exception 'Rode supabase/migrations/0002_security_fixes.sql antes deste arquivo.';
  end if;
end $$;

alter type public.goal add value if not exists 'project';

alter table public.checkins
  add column minutes integer check (minutes between 1 and 1440),
  add column pages integer check (pages between 1 and 2000),
  add column title text check (char_length(title) between 3 and 80);

-- NOT VALID: rows created before this migration have no numbers and stay valid.
alter table public.checkins
  add constraint study_needs_minutes check (goal::text <> 'study' or coalesce(minutes, 0) >= 60) not valid,
  add constraint reading_needs_pages check (goal::text <> 'reading' or coalesce(pages, 0) >= 1) not valid,
  add constraint project_needs_title check (goal::text <> 'project' or char_length(trim(coalesce(title, ''))) >= 3) not valid;

grant insert (minutes, pages, title) on public.checkins to authenticated;

create or replace function public.checkins_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.group_id := public.my_group_id();
  new.day := public.sp_today();          -- never trust the client for the date
  new.created_at := now();
  if new.group_id is null then
    raise exception 'not a member';
  end if;
  if new.photo_path not like new.group_id::text || '/' || new.user_id::text || '/%' then
    raise exception 'invalid photo path';
  end if;
  -- The upload must be finished before the check-in (no late or missing proof).
  if not exists (select 1 from storage.objects where bucket_id = 'media' and name = new.photo_path) then
    raise exception 'photo not uploaded';
  end if;
  -- Each goal keeps only its own fields.
  new.summary := case when new.goal::text = 'study' then trim(new.summary) end;
  new.minutes := case when new.goal::text = 'study' then new.minutes end;
  new.pages := case when new.goal::text = 'reading' then new.pages end;
  new.title := case when new.goal::text = 'project' then trim(new.title) end;
  return new;
end;
$$;

-- Only the three daily goals make a day complete; projects are a bonus.
create or replace view public.completed_days
with (security_invoker = true)
as
select c.user_id, c.day
from public.checkins c
left join public.dispute_results r on r.checkin_id = c.id
where coalesce(r.status, 'none') <> 'upheld'
  and c.goal::text in ('study', 'typing', 'reading')
group by c.user_id, c.day
having count(distinct c.goal) = 3;
