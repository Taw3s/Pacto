-- The membership history (0018) still records every way out after the security patch (0019–0024)
-- rewrote leaving, removing and _drop_member. Runs after membership_binding_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000061', 'ana61@x.com'),
  ('00000000-0000-0000-0000-000000000062', 'bea62@x.com'),
  ('00000000-0000-0000-0000-000000000063', 'caio63@x.com'),
  ('00000000-0000-0000-0000-000000000064', 'davi64@x.com');

-- Ana creates a group; Bea, Caio and Davi join it.
select pg_temp.act_as('00000000-0000-0000-0000-000000000061');
set role authenticated;
create temp table g61_code as select public.create_group('Grupo 61', 'Ana', array['coffee']) as code;
reset role;
grant select on g61_code to authenticated;
do $$ declare u uuid; n text; begin
  for u, n in select * from (values ('00000000-0000-0000-0000-000000000062'::uuid, 'Bea'), ('00000000-0000-0000-0000-000000000063', 'Caio'), ('00000000-0000-0000-0000-000000000064', 'Davi')) v loop
    perform set_config('request.jwt.claim.sub', u::text, false);
    set local role authenticated;
    perform public.join_group((select code from g61_code), n);
    reset role;
  end loop;
end $$;
create temp table g61 as select group_id as id from public.members where user_id = '00000000-0000-0000-0000-000000000061';
grant select on g61 to authenticated;
do $$ begin
  assert (select count(*) from public.membership_log where group_id = (select id from g61) and left_on is null) = 4, 'four open stays';
end $$;

-- Bea leaves through the API's entry point (0024).
select pg_temp.act_as('00000000-0000-0000-0000-000000000062');
set role authenticated;
select public.change_membership((select id from g61), 'leave');
reset role;
do $$ begin
  assert not exists (select 1 from public.membership_log where user_id = '00000000-0000-0000-0000-000000000062'), 'Bea still linked';
  assert (select count(*) from public.membership_log where group_id = (select id from g61) and left_on is not null) = 1, 'Bea''s stay not closed';
end $$;

-- Ana (owner) removes Caio through the same entry point.
select pg_temp.act_as('00000000-0000-0000-0000-000000000061');
set role authenticated;
select public.change_membership((select id from g61), 'remove', '00000000-0000-0000-0000-000000000063');
reset role;
do $$ begin
  assert not exists (select 1 from public.membership_log where user_id = '00000000-0000-0000-0000-000000000063'), 'Caio still linked';
  assert (select count(*) from public.membership_log where group_id = (select id from g61) and left_on is not null) = 2, 'Caio''s stay not closed';
end $$;

-- Deleting an account drops the member as the server does (_drop_member, rewritten in 0023): Ana leaves, Davi inherits.
select public._drop_member('00000000-0000-0000-0000-000000000061', (select id from g61));
do $$ begin
  assert (select owner_id from public.groups where id = (select id from g61)) = '00000000-0000-0000-0000-000000000064', 'Davi did not inherit';
  assert (select count(*) from public.membership_log where group_id = (select id from g61) and left_on is not null) = 3, 'Ana''s stay not closed';
end $$;

-- The last person leaves: the group goes and the last stay is closed too.
select public._drop_member('00000000-0000-0000-0000-000000000064', (select id from g61));
do $$ begin
  assert not exists (select 1 from public.groups where id = (select id from g61)), 'group still exists';
  assert (select count(*) from public.membership_log where group_id = (select id from g61) and left_on is null) = 0, 'an open stay left behind';
  assert (select count(*) from public.membership_log where group_id = (select id from g61)) = 4, 'a stay was lost';
end $$;

select 'MEMBERSHIP LOG AFTER PATCH TESTS PASSED' as result;
