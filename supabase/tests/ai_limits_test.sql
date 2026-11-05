-- Limits on AI judge calls (0014). Runs after typing_minutes_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Members can neither claim nor see the attempts.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  begin
    perform public.claim_ai_review(gen_random_uuid(), auth.uid());
    raise exception 'FAIL: a member claimed';
  exception when insufficient_privilege then null; end;
  begin
    perform count(*) from public.ai_review_attempts;
    raise exception 'FAIL: a member read the attempts';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

set role service_role;
do $$
declare
  c uuid := (select c.id from public.checkins c where not exists (select 1 from public.checkin_reviews r where r.checkin_id = c.id) limit 1);
  reviewed uuid := (select checkin_id from public.checkin_reviews limit 1);
  u uuid := '00000000-0000-0000-0000-000000000002';
begin
  assert c is not null, 'a check-in without review exists';
  assert public.claim_ai_review(reviewed, u) = 'exists', 'a reviewed proof is not sent again';
  assert public.claim_ai_review(c, u) = 'ok', 'first attempt';
  assert public.claim_ai_review(c, u) = 'busy', 'a second request right away waits';
  -- Two minutes later (attempt moved back), then a third.
  update public.ai_review_attempts set attempted_at = attempted_at - interval '2 minutes' where checkin_id = c;
  assert public.claim_ai_review(c, u) = 'ok', 'second attempt';
  update public.ai_review_attempts set attempted_at = attempted_at - interval '2 minutes' where checkin_id = c;
  assert public.claim_ai_review(c, u) = 'ok', 'third attempt';
  update public.ai_review_attempts set attempted_at = attempted_at - interval '2 minutes' where checkin_id = c;
  assert public.claim_ai_review(c, u) = 'exhausted', 'no fourth attempt';
  -- 30 attempts today on other proofs use up the person's day.
  insert into public.ai_review_attempts (checkin_id, user_id, attempted_at)
  select c, u, now() - interval '10 minutes' from generate_series(1, 27);
end $$;
reset role;

-- A fresh proof for the same person: refused once 30 attempts were made today.
set role service_role;
do $$
declare
  other uuid := (select c.id from public.checkins c
                 where not exists (select 1 from public.checkin_reviews r where r.checkin_id = c.id)
                   and not exists (select 1 from public.ai_review_attempts a where a.checkin_id = c.id) limit 1);
begin
  assert other is not null, 'a second unreviewed check-in exists';
  assert (select count(*) from public.ai_review_attempts where user_id = '00000000-0000-0000-0000-000000000002') = 30, 'thirty attempts today';
  assert public.claim_ai_review(other, '00000000-0000-0000-0000-000000000002') = 'limit', 'daily limit';
  assert public.claim_ai_review(other, '00000000-0000-0000-0000-000000000003') = 'ok', 'another member is not limited';
end $$;
reset role;

select 'AI LIMITS TESTS PASSED' as result;
