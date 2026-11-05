-- Welcome shown once per person and group (0029). Runs after the migration, applied twice by run.sh.
\set ON_ERROR_STOP on

-- Everyone who was already a member is marked as having seen it.
do $$ begin
  assert (select count(*) from public.members m where not exists (select 1 from public.welcome_seen w where w.user_id = m.user_id)) = 0,
    'existing members do not get a late welcome';
end $$;

-- A new member has no row until the welcome is shown.
insert into groups(id,name,invite_code) values ('95000000-0000-0000-0000-000000000001','Welcome','WELCOME1');
insert into auth.users(id,email,raw_user_meta_data) values
  ('95000000-0000-0000-0000-000000000002','welcome@pacto.test','{"invite_code":"WELCOME1","display_name":"Nova"}'),
  ('95000000-0000-0000-0000-000000000003','welcome2@pacto.test','{"invite_code":"WELCOME1","display_name":"Outra"}');
do $$ begin
  assert (select count(*) from public.members where group_id = '95000000-0000-0000-0000-000000000001') = 2, 'both joined';
  assert not exists (select 1 from public.welcome_seen where group_id = '95000000-0000-0000-0000-000000000001'), 'new members not marked yet';
end $$;

select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  assert (select count(*) from public.welcome_seen) = 0, 'nothing to read before the welcome';
  perform public.mark_welcome_seen();
  perform public.mark_welcome_seen();
  assert (select count(*) from public.welcome_seen) = 1, 'marked once, idempotent';
  begin
    insert into public.welcome_seen (user_id, group_id) values ('95000000-0000-0000-0000-000000000003', '95000000-0000-0000-0000-000000000001');
    raise exception 'FAIL: marked someone else';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The other member cannot see Nova's row, and is still unmarked.
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000003',false);
set role authenticated;
do $$ begin
  assert (select count(*) from public.welcome_seen) = 0, 'reads only its own row';
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform 1 from public.welcome_seen;
    raise exception 'FAIL: anon read welcome_seen';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Leaving the group removes the row with the membership.
delete from public.members where user_id = '95000000-0000-0000-0000-000000000002';
do $$ begin
  assert not exists (select 1 from public.welcome_seen where user_id = '95000000-0000-0000-0000-000000000002'), 'row goes with the membership';
end $$;

select 'WELCOME TESTS PASSED' as result;
