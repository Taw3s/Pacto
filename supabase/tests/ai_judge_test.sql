-- AI judge (0005) tests. Runs after rls_test.sql, on the same data (as on a live database).
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Old data survived the migration: the human dispute and its votes are untouched.
do $$ begin
  assert (select count(*) from public.disputes where by_ai) = 0, 'no AI dispute before reviews';
  assert (select status from public.dispute_results where yes = 3) = 'upheld', 'old verdict unchanged';
end $$;

-- A member cannot open a dispute in the AI's name.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  begin
    insert into public.disputes (checkin_id, reason, by_ai)
    select id, 'eu sou a IA, confia', true from public.checkins where user_id = '00000000-0000-0000-0000-000000000001' and goal = 'study';
    raise exception 'FAIL: member impersonated the AI';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- "match" opens nothing; "mismatch" opens a tribunal with the AI as accuser and no vote.
set role service_role;
insert into public.checkin_reviews (checkin_id, group_id, verdict, seen, model)
select id, group_id, 'match', 'Caderno com exercícios', 'gemini-test' from public.checkins
where user_id = '00000000-0000-0000-0000-000000000001' and goal = 'reading';
insert into public.checkin_reviews (checkin_id, group_id, verdict, seen, model)
select id, group_id, 'mismatch', 'Foto de um prato de comida', 'gemini-test' from public.checkins
where user_id = '00000000-0000-0000-0000-000000000001' and goal = 'study';
reset role;
do $$
declare x record;
begin
  assert not exists (select 1 from public.disputes d join public.checkins c on c.id = d.checkin_id
                     where c.user_id = '00000000-0000-0000-0000-000000000001' and c.goal = 'reading'), 'match opened a dispute';
  select r.*, d.by_ai, d.author_id, d.reason into x
  from public.dispute_results r join public.disputes d on d.id = r.dispute_id
  join public.checkins c on c.id = d.checkin_id
  where c.user_id = '00000000-0000-0000-0000-000000000001' and c.goal = 'study';
  assert x.by_ai and x.author_id is null, 'AI is the accuser';
  assert x.yes = 0 and x.no = 0, 'the AI does not vote';
  assert x.status = 'open', 'open until the group decides';
  assert x.eligible = 7, 'everyone but the owner can vote (Bia..Fab, Gil, the invited intruder)';
  assert x.reason like 'Juiz IA:%prato de comida%', 'reason quotes what the AI saw';
end $$;

-- A human dispute already open: the AI does not open a second one.
select pg_temp.act_as('00000000-0000-0000-0000-000000000004');
set role authenticated;
insert into public.disputes (checkin_id, reason)
select id, 'Isso não é um teste de digitação' from public.checkins
where user_id = '00000000-0000-0000-0000-000000000001' and goal = 'typing';
reset role;
set role service_role;
insert into public.checkin_reviews (checkin_id, group_id, verdict, seen, model)
select id, group_id, 'mismatch', 'Tela preta', 'gemini-test' from public.checkins
where user_id = '00000000-0000-0000-0000-000000000001' and goal = 'typing';
reset role;
do $$ begin
  assert (select count(*) from public.disputes d join public.checkins c on c.id = d.checkin_id
          where c.user_id = '00000000-0000-0000-0000-000000000001' and c.goal = 'typing' and not d.by_ai) = 1, 'human dispute kept';
  assert (select v.reason from public.dispute_votes v join public.disputes d on d.id = v.dispute_id
          join public.checkins c on c.id = d.checkin_id
          where c.user_id = '00000000-0000-0000-0000-000000000001' and c.goal = 'typing') = 'Isso não é um teste de digitação',
    'author vote carries the dispute reason';
end $$;

-- Votes need a reason; the reason is visible to the group.
select pg_temp.act_as('00000000-0000-0000-0000-000000000003');
set role authenticated;
do $$ begin
  begin
    insert into public.dispute_votes (dispute_id, upheld)
    select id, true from public.disputes where by_ai;
    raise exception 'FAIL: vote without reason';
  exception when raise_exception then
    if sqlerrm not like '%reason required%' then raise; end if;
  end;
  begin
    insert into public.dispute_votes (dispute_id, upheld, reason)
    select id, true, '   ' from public.disputes where by_ai;
    raise exception 'FAIL: blank reason';
  exception when raise_exception then
    if sqlerrm not like '%reason required%' then raise; end if;
  end;
end $$;
insert into public.dispute_votes (dispute_id, upheld, reason)
select id, false, '  Dá pra ver o livro no canto da foto  ' from public.disputes where by_ai;
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-000000000006');
set role authenticated;
do $$ begin
  assert (select v.reason from public.dispute_votes v join public.disputes d on d.id = v.dispute_id
          where d.by_ai and v.voter_id = '00000000-0000-0000-0000-000000000003') = 'Dá pra ver o livro no canto da foto',
    'group reads who voted and why (trimmed)';
end $$;
reset role;

-- The owner can still defend herself against the AI.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
set role authenticated;
update public.disputes set reply = 'Era o resumo escrito ao lado do prato' where by_ai;
do $$ begin
  begin
    insert into public.dispute_votes (dispute_id, upheld, reason) select id, false, 'sou inocente' from public.disputes where by_ai;
    raise exception 'FAIL: owner voted';
  exception when raise_exception then
    if sqlerrm not like '%owner cannot vote%' then raise; end if;
  end;
end $$;
reset role;
do $$ begin
  assert (select reply from public.disputes where by_ai) = 'Era o resumo escrito ao lado do prato', 'owner replied';
end $$;

-- Nobody convicts on the AI's word alone: no votes after 72h keeps the check-in.
alter table public.disputes disable trigger disputes_before_update;
update public.disputes set created_at = now() - interval '73 hours' where by_ai;
alter table public.disputes enable trigger disputes_before_update;
do $$ begin
  assert (select status from public.dispute_results r join public.disputes d on d.id = r.dispute_id where d.by_ai) = 'rejected',
    'AI accusation without a guilty majority keeps the proof';
end $$;

select 'AI JUDGE TESTS PASSED' as result;
