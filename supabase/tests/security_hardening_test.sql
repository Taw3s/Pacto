\set ON_ERROR_STOP on
insert into groups(id,name,invite_code) values
('90000000-0000-0000-0000-0000000000a1','Hardening','HARDEN01'),
('90000000-0000-0000-0000-0000000000b1','Private menu','HARDEN02');
insert into auth.users(id,email,raw_user_meta_data) values
('90000000-0000-0000-0000-000000000001','hardening-owner@pacto.test','{"invite_code":"HARDEN01"}'),
('90000000-0000-0000-0000-000000000002','hardening-member@pacto.test','{"invite_code":"HARDEN01"}');
update groups set owner_id='90000000-0000-0000-0000-000000000001' where invite_code='HARDEN01';
insert into debt_menus(group_id,effective_from,items) values
('90000000-0000-0000-0000-0000000000a1','2000-01-01',array['pizza']),
('90000000-0000-0000-0000-0000000000b1','2000-01-01',array['coffee']);
select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
  assert public.debt_items_on('90000000-0000-0000-0000-0000000000a1',public.sp_today()) = array['pizza'], 'own menu still works';
  assert public.debt_items_on('90000000-0000-0000-0000-0000000000b1',public.sp_today()) <> array['coffee'], 'foreign menu stays private';
  perform public.start_typing_test('pc'); perform public.start_typing_test('pc'); perform public.start_typing_test('pc');
  begin
    perform public.start_typing_test('pc'); raise exception 'FAIL: fourth attempt accepted';
  exception when raise_exception then
    if sqlerrm not like '%no attempts left%' then raise; end if;
  end;
  begin
    perform count(*) from public.media_cleanup_jobs; raise exception 'FAIL: client read cleanup queue';
  exception when insufficient_privilege then null; end;
  assert public.remove_member('90000000-0000-0000-0000-000000000002')='left', 'owner removes member';
end $$;
reset role;
delete from auth.users where id='90000000-0000-0000-0000-000000000002';
do $$ begin
  assert exists(select 1 from media_cleanup_jobs where prefix='90000000-0000-0000-0000-0000000000a1/90000000-0000-0000-0000-000000000002'), 'cleanup survives removal and account deletion';
end $$;
set role authenticated;
select public.leave_group();
reset role;
do $$ begin
  assert not exists(select 1 from groups where invite_code='HARDEN01'), 'last member closes group';
  assert exists(select 1 from media_cleanup_jobs where prefix='90000000-0000-0000-0000-0000000000a1/90000000-0000-0000-0000-000000000001'), 'closed group retains cleanup work';
  assert not has_function_privilege('authenticated','public.claim_ai_review(uuid,uuid)','execute'), 'AI quota function stays privileged';
end $$;
select 'SECURITY HARDENING TESTS PASSED' as result;
