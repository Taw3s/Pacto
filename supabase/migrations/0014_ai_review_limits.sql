-- Pacto — limits on calls to the AI judge (Gemini). Run once, after 0013_typing_five_minutes.sql.
--
-- A proof is reviewed once (an existing review is kept), but a review that fails is not saved, so
-- without limits it could be retried forever, and many requests at the same instant would all
-- reach Gemini. Every Gemini call now needs a claim first:
-- * one call at a time per proof: a new attempt only 90 seconds after the previous one;
-- * at most 3 attempts per proof;
-- * at most 30 attempts per person a day (a normal day uses about 10).
-- The app's server asks for the claim with its service key; members cannot call it.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'typing_tests' and column_name = 'minutes') then
    raise exception 'Rode supabase/migrations/0013_typing_five_minutes.sql antes deste arquivo.';
  end if;
end $$;

create table public.ai_review_attempts (
  id bigint generated always as identity primary key,
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index ai_review_attempts_checkin_idx on public.ai_review_attempts (checkin_id);
create index ai_review_attempts_user_idx on public.ai_review_attempts (user_id, attempted_at);
alter table public.ai_review_attempts enable row level security;
revoke all on public.ai_review_attempts from anon, authenticated;

/**
 * Asks to call the AI judge for one proof on behalf of a member. Returns 'ok' (go ahead), 'exists'
 * (already reviewed), 'busy' (an attempt is in flight or was just made), 'exhausted' (3 attempts
 * used) or 'limit' (the member's 30 for today are used).
 */
create or replace function public.claim_ai_review(p_checkin uuid, p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
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

revoke all on function public.claim_ai_review(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_ai_review(uuid, uuid) to service_role;
grant select, insert on public.ai_review_attempts to service_role;
