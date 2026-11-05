-- Serialize daily attempt limits without changing their values or scoring.
-- Run after 0018_membership_log.sql; existing function grants are preserved by CREATE OR REPLACE.
do $$ begin
  if to_regclass('public.membership_log') is null then
    raise exception 'Rode supabase/migrations/0018_membership_log.sql antes deste arquivo.';
  end if;
end $$;

create or replace function public.start_typing_test(p_device text, p_mode text default 'words', p_text text default null, p_lang text default 'pt', p_minutes integer default 1)
returns table (test_id uuid, seconds integer, start_word integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
  v_id uuid;
  v_seconds integer;
  v_start integer := 0;
begin
  -- Serialize each user's daily quota check and insertion, across different requests.
  perform pg_advisory_xact_lock(hashtext('typing-start:' || auth.uid()::text));
  if v_group is null then
    raise exception 'not a member';
  end if;
  if p_device not in ('pc', 'mobile') then
    raise exception 'invalid device';
  end if;
  if p_mode not in ('words', 'text') or (p_mode = 'text') <> (p_text is not null) or char_length(coalesce(p_text, '')) > 60 then
    raise exception 'invalid mode';
  end if;
  -- An English text is an 'en-' text, and only an English test types it.
  if p_lang not in ('pt', 'en') or (p_mode = 'text' and (p_text like 'en-%') <> (p_lang = 'en')) then
    raise exception 'invalid language';
  end if;
  if p_minutes is null or p_minutes not in (1, 5) then
    raise exception 'invalid length';
  end if;
  if (select count(*) from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today()) >= 3 then
    raise exception 'no attempts left today';
  end if;
  if p_mode = 'text' then
    v_start := coalesce((select p.words from public.typing_progress p where p.user_id = auth.uid() and p.text_id = p_text), 0);
  end if;
  v_seconds := (select c.seconds from public.typing_config c) * p_minutes;
  insert into public.typing_tests (user_id, group_id, day, device, seconds, mode, text_id, start_word, lang, minutes)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds, p_mode, case when p_mode = 'text' then p_text end, v_start, p_lang, p_minutes)
  returning id into v_id;
  return query select v_id, v_seconds, v_start;
end;
$$;

create or replace function public.claim_ai_review(p_checkin uuid, p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Serialize each user's daily quota check and insertion, across different requests.
  perform pg_advisory_xact_lock(hashtext('ai-review-user:' || p_user::text));
  -- Serializes concurrent requests for the same proof.
  perform pg_advisory_xact_lock(hashtext('ai-review:' || p_checkin::text));
  if exists (select 1 from public.checkin_reviews r where r.checkin_id = p_checkin) then
    return 'exists';
  end if;
  if exists (select 1 from public.ai_review_attempts a where a.checkin_id = p_checkin and a.attempted_at > now() - interval '90 seconds') then
    return 'busy';
  end if;
  if (select count(*) from public.ai_review_attempts a where a.checkin_id = p_checkin) >= 3 then
    return 'exhausted';
  end if;
  if (select count(*) from public.ai_review_attempts a
      where a.user_id = p_user and (a.attempted_at at time zone 'America/Sao_Paulo')::date = public.sp_today()) >= 30 then
    return 'limit';
  end if;
  insert into public.ai_review_attempts (checkin_id, user_id) values (p_checkin, p_user);
  return 'ok';
end;
$$;
