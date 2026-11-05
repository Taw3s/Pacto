\set ON_ERROR_STOP on
begin;
insert into groups(id,name,invite_code) values
('94000000-0000-0000-0000-0000000000a1','Bound A','BIND0001'),
('94000000-0000-0000-0000-0000000000b1','Bound B','BIND0002');
insert into auth.users(id,email,raw_user_meta_data) values
('94000000-0000-0000-0000-000000000001','bind-owner@pacto.test','{"invite_code":"BIND0001"}'),
('94000000-0000-0000-0000-000000000002','bind-mover@pacto.test','{"invite_code":"BIND0001"}'),
('94000000-0000-0000-0000-000000000003','bind-other@pacto.test','{"invite_code":"BIND0002"}');
update groups set owner_id='94000000-0000-0000-0000-000000000001' where invite_code='BIND0001';
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  perform public.leave_group();
  perform public.join_group('BIND0002','Moved');
  begin
    perform public.change_membership('94000000-0000-0000-0000-0000000000a1','leave',auth.uid());
    raise exception 'FAIL: old group context accepted';
  exception when raise_exception then
    if sqlerrm not like '%membership changed%' then raise; end if;
  end;
  assert public.my_group_id()='94000000-0000-0000-0000-0000000000b1', 'current membership unchanged';
end $$;
reset role;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',false);
set role authenticated;
do $$ begin
  assert public.change_membership('94000000-0000-0000-0000-0000000000a1','leave',auth.uid())='closed', 'valid bound leave works';
end $$;
reset role;
do $$ begin
  assert exists(select 1 from groups where id='94000000-0000-0000-0000-0000000000b1'), 'other group preserved';
  assert not has_function_privilege('anon','public.change_membership(uuid,text,uuid)','execute'), 'anonymous mutation remains blocked';
end $$;
rollback;
select 'MEMBERSHIP BINDING TESTS PASSED' as result;
