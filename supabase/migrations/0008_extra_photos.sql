-- Pacto — up to 4 photos per proof. Run once, after 0007_retake_extra_study.sql.
--
-- photo_path stays the main photo (lists, thumbnails, old proofs); extra_photos holds up to 3 more.
-- Every extra photo must be in the owner's folder, already uploaded, and not repeated.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'checkins' and column_name = 'retake_of') then
    raise exception 'Rode supabase/migrations/0007_retake_extra_study.sql antes deste arquivo.';
  end if;
end $$;

alter table public.checkins
  add column extra_photos text[] not null default '{}'
    constraint extra_photos_max check (cardinality(extra_photos) <= 3);

grant insert (extra_photos) on public.checkins to authenticated;

create or replace function public.checkins_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_last uuid;
  v_status text;
  v_path text;
begin
  new.user_id := auth.uid();
  new.group_id := public.my_group_id();
  new.day := public.sp_today();          -- never trust the client for the date
  new.created_at := now();
  new.extra := coalesce(new.extra, false);
  new.retake_of := null;
  new.extra_photos := coalesce(new.extra_photos, '{}');
  if new.group_id is null then
    raise exception 'not a member';
  end if;
  -- The main photo and every extra one: own folder, really uploaded, no repeats.
  if array_position(new.extra_photos, new.photo_path) is not null
     or cardinality(new.extra_photos) <> (select count(distinct p) from unnest(new.extra_photos) p) then
    raise exception 'repeated photo';
  end if;
  foreach v_path in array array_prepend(new.photo_path, new.extra_photos) loop
    if v_path is null or char_length(v_path) > 200 or v_path not like new.group_id::text || '/' || new.user_id::text || '/%' then
      raise exception 'invalid photo path';
    end if;
    -- The upload must be finished before the check-in (no late or missing proof).
    if not exists (select 1 from storage.objects where bucket_id = 'media' and name = v_path) then
      raise exception 'photo not uploaded';
    end if;
  end loop;
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
