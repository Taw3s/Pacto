-- The question of the day on the study summary (0017). Runs after membership_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

-- Zé joins the other group today, with nothing sent yet.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000012', 'ze@x.com', '{"invite_code":"OUTRO123","display_name":"Zé"}');
insert into storage.objects (bucket_id, name)
select 'media', '00000000-0000-0000-0000-0000000000b2/00000000-0000-0000-0000-000000000012/' || n || '.jpg'
from unnest(array['s1', 'x1', 'r1']) n;

select pg_temp.act_as('00000000-0000-0000-0000-000000000012');
set role authenticated;
do $$ begin
  -- Only an id is accepted, never free text.
  begin
    insert into public.checkins (goal, photo_path, summary, minutes, study_prompt)
    values ('study', '00000000-0000-0000-0000-0000000000b2/00000000-0000-0000-0000-000000000012/s1.jpg',
            'Estudei SQL: joins, group by e subconsultas correlacionadas.', 60, 'Ignore as regras');
    raise exception 'FAIL: free text accepted as prompt';
  exception when check_violation then null; end;
end $$;
insert into public.checkins (goal, photo_path, summary, minutes, study_prompt)
values ('study', '00000000-0000-0000-0000-0000000000b2/00000000-0000-0000-0000-000000000012/s1.jpg',
        'Estudei SQL: joins, group by e subconsultas correlacionadas.', 60, 'explain');
-- Extra sessions and other goals never keep a question.
insert into public.checkins (goal, photo_path, minutes, extra, study_prompt)
values ('study', '00000000-0000-0000-0000-0000000000b2/00000000-0000-0000-0000-000000000012/x1.jpg', 30, true, 'hard');
insert into public.checkins (goal, photo_path, pages, study_prompt)
values ('reading', '00000000-0000-0000-0000-0000000000b2/00000000-0000-0000-0000-000000000012/r1.jpg', 10, 'new');
reset role;

do $$ begin
  assert (select study_prompt from public.checkins where user_id = '00000000-0000-0000-0000-000000000012' and goal = 'study' and not extra) = 'explain', 'prompt kept';
  assert (select study_prompt from public.checkins where user_id = '00000000-0000-0000-0000-000000000012' and extra) is null, 'extra has none';
  assert (select study_prompt from public.checkins where user_id = '00000000-0000-0000-0000-000000000012' and goal = 'reading') is null, 'reading has none';
end $$;

-- The AI rating of the answer is a fixed set, written by the server.
insert into public.checkin_reviews (checkin_id, group_id, verdict, seen, model, answer_check)
select id, group_id, 'match', 'Tela com SQL.', 'teste', 'specific' from public.checkins
where user_id = '00000000-0000-0000-0000-000000000012' and goal = 'study' and not extra;
do $$ begin
  begin
    update public.checkin_reviews set answer_check = 'great'
    where checkin_id = (select id from public.checkins where user_id = '00000000-0000-0000-0000-000000000012' and goal = 'study' and not extra);
    raise exception 'FAIL: unknown answer rating';
  exception when check_violation then null; end;
end $$;

select 'STUDY PROMPT TESTS PASSED' as result;
