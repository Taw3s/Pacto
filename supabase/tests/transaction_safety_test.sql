\set ON_ERROR_STOP on
begin;
insert into groups(id,name,invite_code) values
('93000000-0000-0000-0000-0000000000a1','Atomic A','ATOMIC01'),
('93000000-0000-0000-0000-0000000000b1','Atomic B','ATOMIC02');
insert into auth.users(id,email,raw_user_meta_data) values
('93000000-0000-0000-0000-000000000001','atomic-owner@pacto.test','{"invite_code":"ATOMIC01"}'),
('93000000-0000-0000-0000-000000000002','atomic-target@pacto.test','{"invite_code":"ATOMIC01"}'),
('93000000-0000-0000-0000-000000000003','atomic-foreign@pacto.test','{"invite_code":"ATOMIC02"}');
update groups set owner_id='93000000-0000-0000-0000-000000000001' where invite_code='ATOMIC01';
do $$ begin
  begin
    perform public._drop_member('93000000-0000-0000-0000-000000000003','93000000-0000-0000-0000-0000000000a1');
    raise exception 'FAIL: mismatched cleanup removed another group member';
  exception when raise_exception then
    if sqlerrm not like '%not a member of this group%' then raise; end if;
  end;
  assert exists(select 1 from members where user_id='93000000-0000-0000-0000-000000000003'), 'foreign member remains';
  assert not has_function_privilege('authenticated','public._drop_member(uuid,uuid)','execute'), 'internal cleanup remains private';
end $$;
select set_config('request.jwt.claim.sub','93000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
  assert public.remove_member('93000000-0000-0000-0000-000000000002')='left', 'legitimate removal works';
  begin
    perform public.remove_member('93000000-0000-0000-0000-000000000002');
    raise exception 'FAIL: repeated removal accepted';
  exception when raise_exception then
    if sqlerrm not like '%not in your group%' then raise; end if;
  end;
  assert public.leave_group()='closed', 'last member can still close group';
end $$;
reset role;
rollback;
select 'TRANSACTION SAFETY TESTS PASSED' as result;
