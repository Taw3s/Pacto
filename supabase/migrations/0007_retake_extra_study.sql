-- Pacto — retaking a condemned proof and extra study sessions. Run once, after 0006_chests_push.sql.
--
-- * Retake: when the tribunal annuls a proof, its owner may send a new one for the same goal,
--   but only on the same day (the database sets the day, so the deadline is 23:59 in São Paulo).
--   Nothing is deleted: the annulled proof stays in the tribunal, the retake points to it.
-- * Extra study sessions: after the study proof, more sessions (photo + minutes, >= 10) can be
--   added that day. Each one is its own proof (the AI checks it, the group can contest it) and
--   adds ranking minutes; only the first proof makes the study goal count.

do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'chest_openings') then
    raise exception 'Rode supabase/migrations/0006_chests_push.sql antes deste arquivo.';
  end if;
end $$;

alter table public.checkins
  add column extra boolean not null default false,
  add column retake_of uuid unique references public.checkins (id) on delete cascade;

-- One first proof per goal and day; retakes are unique per annulled proof (no forks).
alter table public.checkins drop constraint checkins_user_id_day_goal_key;
create unique index checkins_first_proof_key on public.checkins (user_id, day, goal) where not extra and retake_of is null;

alter table public.checkins
  add constraint extra_is_study check (not extra or goal::text = 'study'),
  drop constraint study_needs_summary,
  add constraint study_needs_summary check (goal::text <> 'study' or extra or char_length(trim(coalesce(summary, ''))) >= 40),
  drop constraint study_needs_minutes,
  add constraint study_needs_minutes check (goal::text <> 'study' or coalesce(minutes, 0) >= case when extra then 10 else 60 end) not valid;

grant insert (extra) on public.checkins to authenticated;

create or replace function public.checkins_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_last uuid;
  v_status text;
begin
  new.user_id := auth.uid();
  new.group_id := public.my_group_id();
  new.day := public.sp_today();          -- never trust the client for the date
  new.created_at := now();
  new.extra := coalesce(new.extra, false);
  new.retake_of := null;
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
  new.summary := case when new.goal::text = 'study' then nullif(trim(new.summary), '') end;
  new.minutes := case when new.goal::text = 'study' then new.minutes end;
  new.pages := case when new.goal::text = 'reading' then new.pages end;
  new.title := case when new.goal::text = 'project' then trim(new.title) end;

  if new.extra then
    -- An extra session needs today's study proof (not annulled) and is limited to 5 a day.
    if new.goal::text <> 'study' then
      raise exception 'only study has extra sessions';
    end if;
    if not exists (
      select 1 from public.checkins c left join public.dispute_results r on r.checkin_id = c.id
      where c.user_id = new.user_id and c.day = new.day and c.goal = new.goal and not c.extra
        and coalesce(r.status, 'none') <> 'upheld'
    ) then
      raise exception 'send the study proof first';
    end if;
    if (select count(*) from public.checkins where user_id = new.user_id and day = new.day and extra) >= 5 then
      raise exception 'too many extra sessions';
    end if;
  else
    -- The goal was already sent today: only a proof annulled by the tribunal can be retaken.
    select c.id, r.status into v_last, v_status
    from public.checkins c left join public.dispute_results r on r.checkin_id = c.id
    where c.user_id = new.user_id and c.day = new.day and c.goal = new.goal and not c.extra
    order by c.created_at desc
    limit 1;
    if v_last is not null then
      if coalesce(v_status, 'none') <> 'upheld' then
        raise exception 'goal already sent today' using errcode = 'unique_violation';
      end if;
      new.retake_of := v_last;
    end if;
  end if;
  return new;
end;
$$;

-- Only first proofs and retakes (never extra sessions) make a day complete.
create or replace view public.completed_days
with (security_invoker = true)
as
select c.user_id, c.day
from public.checkins c
left join public.dispute_results r on r.checkin_id = c.id
where coalesce(r.status, 'none') <> 'upheld'
  and not c.extra
  and c.goal::text in ('study', 'typing', 'reading')
group by c.user_id, c.day
having count(distinct c.goal) = 3;
