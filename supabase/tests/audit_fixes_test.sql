\set ON_ERROR_STOP on
begin;
insert into groups(id,name,invite_code) values ('97000000-0000-0000-0000-0000000000a1','Audit','AUDIT001');
insert into auth.users(id,email,raw_user_meta_data) values
('97000000-0000-0000-0000-000000000001','audit-owner@pacto.test','{"invite_code":"AUDIT001"}'),
('97000000-0000-0000-0000-000000000002','audit-removed@pacto.test','{"invite_code":"AUDIT001"}'),
('97000000-0000-0000-0000-000000000003','audit-solo@pacto.test','{}');
update groups set owner_id='97000000-0000-0000-0000-000000000001' where id='97000000-0000-0000-0000-0000000000a1';
update members set joined_on = sp_today() - 30, created_at = now() - interval '30 days' where group_id='97000000-0000-0000-0000-0000000000a1';

-- 1. Removal rotates the code: neither the removed account nor a new sign-up gets in with the old one.
select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
  assert public.remove_member('97000000-0000-0000-0000-000000000002') = 'left', 'removal works';
  assert (select invite_code from groups) <> 'AUDIT001', 'code rotated';
  assert (select invite_code from groups) ~ '^[A-HJ-NP-Z2-9]{8}$', 'new code has the usual shape';
end $$;
reset role;
select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  begin
    perform public.join_group('AUDIT001', 'Back again');
    raise exception 'FAIL: old code still admits';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  assert public.my_group_id() is null, 'removed person stays out';
end $$;
reset role;
insert into auth.users(id,email,raw_user_meta_data) values ('97000000-0000-0000-0000-000000000004','audit-new@pacto.test','{"invite_code":"AUDIT001"}');
do $$ begin
  assert not exists (select 1 from members where user_id='97000000-0000-0000-0000-000000000004'), 'new sign-up with the old code stays out';
  assert not has_function_privilege('authenticated','public._new_invite_code()','execute'), 'code generator is internal';
end $$;

-- 3. A mismatch on a 20-day-old proof opens no tribunal; on today's proof it does.
insert into storage.objects(bucket_id,name) values ('media','97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-000000000001/old.jpg'),
  ('media','97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-000000000001/new.jpg');
select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000001',false);
set role authenticated;
insert into checkins (goal, photo_path, pages) values ('reading', '97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-000000000001/old.jpg', 20);
reset role;
update checkins set day = sp_today() - 20 where photo_path like '%/old.jpg';
select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000001',false);
set role authenticated;
insert into checkins (goal, photo_path, minutes, summary, study_prompt) values ('study', '97000000-0000-0000-0000-0000000000a1/97000000-0000-0000-0000-000000000001/new.jpg', 60, 'Resumo de teste com mais de quarenta caracteres para valer.', 'explain');
reset role;
insert into checkin_reviews (checkin_id, group_id, verdict, seen, model)
select id, group_id, 'mismatch', 'nada', 'test' from checkins where photo_path like '%/old.jpg' or photo_path like '%/new.jpg';
do $$ begin
  assert not exists (select 1 from disputes d join checkins c on c.id = d.checkin_id where c.photo_path like '%/old.jpg'), 'old proof: no tribunal';
  assert exists (select 1 from disputes d join checkins c on c.id = d.checkin_id where c.photo_path like '%/new.jpg' and d.by_ai), 'recent proof: tribunal opens';
end $$;

-- 2. The daily AI quota survives leaving and recreating a group.
select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000003',false);
set role authenticated;
do $$ begin perform public.create_group('Solo', 'Solo', array['coke']); end $$;
reset role;
insert into storage.objects(bucket_id,name)
select 'media', g.id || '/97000000-0000-0000-0000-000000000003/s.jpg' from groups g where g.name = 'Solo';
set role authenticated;
insert into checkins (goal, photo_path, minutes, summary, study_prompt)
select 'study', g.id || '/97000000-0000-0000-0000-000000000003/s.jpg', 60, 'Resumo de teste com mais de quarenta caracteres para valer.', 'explain' from groups g where g.name = 'Solo';
reset role;
insert into ai_review_attempts (checkin_id, user_id, attempted_at)
select c.id, c.user_id, now() - interval '1 hour' from checkins c, generate_series(1, 30) where c.user_id = '97000000-0000-0000-0000-000000000003';
set role authenticated;
do $$ begin assert public.leave_group() = 'closed', 'solo leaves'; end $$;
reset role;
do $$ begin
  assert (select count(*) from ai_review_attempts where user_id = '97000000-0000-0000-0000-000000000003') = 30, 'attempts kept after leaving';
end $$;
set role authenticated;
do $$ begin perform public.create_group('Solo 2', 'Solo', array['coke']); end $$;
reset role;
insert into storage.objects(bucket_id,name)
select 'media', g.id || '/97000000-0000-0000-0000-000000000003/s2.jpg' from groups g where g.name = 'Solo 2';
set role authenticated;
insert into checkins (goal, photo_path, minutes, summary, study_prompt)
select 'study', g.id || '/97000000-0000-0000-0000-000000000003/s2.jpg', 60, 'Resumo de teste com mais de quarenta caracteres para valer.', 'explain' from groups g where g.name = 'Solo 2';
reset role;
do $$ begin
  assert public.claim_ai_review((select id from checkins where user_id = '97000000-0000-0000-0000-000000000003'), '97000000-0000-0000-0000-000000000003') = 'limit',
    'daily quota still applies after recreating a group';
end $$;
rollback;
select 'AUDIT FIXES TESTS PASSED' as result;
