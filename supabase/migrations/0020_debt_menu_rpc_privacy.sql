-- The caller's RLS must apply to menu lookups, just as it applies to direct reads.
-- Existing same-group behavior, service-role access and grants remain unchanged.
do $$ begin
  if position('ai-review-user:' in pg_get_functiondef('public.claim_ai_review(uuid,uuid)'::regprocedure))=0 then
    raise exception 'Apply 0019_concurrent_attempt_limits.sql first';
  end if;
end $$;
alter function public.debt_items_on(uuid, date) security invoker;
