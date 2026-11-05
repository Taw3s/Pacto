-- Creating a challenge and the debt menu (0015). Runs after ai_limits_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

do $$ begin
  assert (select items from public.debt_menus where group_id = '00000000-0000-0000-0000-0000000000a1') = array['coke', 'snack'], 'existing group keeps Coca + salgado';
  assert (select owner_id from public.groups where id = '00000000-0000-0000-0000-0000000000a1') in
         (select user_id from public.members where group_id = '00000000-0000-0000-0000-0000000000a1'), 'existing group gets a member as owner';
end $$;
update public.groups set owner_id = '00000000-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-0000000000a1';

-- Ivo signs up without an invite code: no group. He creates one.
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000011', 'ivo@x.com', '{}');
select pg_temp.act_as('00000000-0000-0000-0000-000000000011');
set role authenticated;
do $$
declare code text; g uuid; monday date;
begin
  begin
    perform public.create_group('Pacto do intruso', 'Ivo', array['coke', 'snack', 'pix']);
    raise exception 'FAIL: three items';
  exception when raise_exception then
    if sqlerrm not like '%invalid menu%' then raise; end if;
  end;
  begin
    perform public.create_group('Pacto do intruso', 'Ivo', array['coke', 'coke']);
    raise exception 'FAIL: repeated item';
  exception when raise_exception then
    if sqlerrm not like '%invalid menu%' then raise; end if;
  end;
  begin
    perform public.create_group('Pacto do intruso', 'Ivo', array['cerveja']);
    raise exception 'FAIL: item outside the menu';
  exception when raise_exception then
    if sqlerrm not like '%invalid menu%' then raise; end if;
  end;
  begin
    perform public.create_group('  ', 'Ivo', array['coffee']);
    raise exception 'FAIL: empty name';
  exception when raise_exception then
    if sqlerrm not like '%invalid name%' then raise; end if;
  end;
  code := public.create_group('Pacto do intruso', 'Ivo', array['coffee', 'chocolate']);
  assert code ~ '^[A-HJ-NP-Z2-9]{8}$', format('invite code %s', code);
  g := public.my_group_id();
  assert (select owner_id from public.groups where id = g) = auth.uid(), 'creator owns the group';
  assert (select invite_code from public.groups where id = g) = code, 'the member sees the code';
  assert (select display_name from public.members where user_id = auth.uid()) = 'Ivo', 'member added';
  assert (select items from public.debt_menus where group_id = g and effective_from = sp_today()) = array['coffee', 'chocolate'], 'menu from today';
  assert public.debt_items_on(g, sp_today()) = array['coffee', 'chocolate'], 'items of today';
  begin
    perform public.create_group('Outro', 'Ivo', array['coke']);
    raise exception 'FAIL: second group';
  exception when raise_exception then
    if sqlerrm not like '%already a member%' then raise; end if;
  end;
  -- The owner changes the menu: it applies from the next Monday.
  assert extract(isodow from public.set_debt_menu(array['pizza'])) = 1, 'a Monday';
  assert public.set_debt_menu(array['pizza']) > sp_today(), 'in the future';
  assert public.debt_items_on(g, sp_today()) = array['coffee', 'chocolate'], 'today keeps the old menu';
  monday := public.set_debt_menu(array['icecream']);
  assert public.debt_items_on(g, monday) = array['icecream'], 'same Monday replaced';
  assert (select count(*) from public.debt_menus where group_id = g) = 2, 'one pending change';
  -- Members of other groups see nothing of this one.
end $$;
reset role;

-- A member who is not the owner cannot change the menu; nobody writes menus directly.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
set role authenticated;
do $$ begin
  begin
    perform public.set_debt_menu(array['pix']);
    raise exception 'FAIL: non-owner changed the menu';
  exception when raise_exception then
    if sqlerrm not like '%only the owner%' then raise; end if;
  end;
  begin
    insert into public.debt_menus (group_id, effective_from, items) values (public.my_group_id(), sp_today(), array['pix']);
    raise exception 'FAIL: wrote a menu';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from public.debt_menus) = 1, 'sees only its own group menus';
end $$;
reset role;

-- Payments only settle items the missed day costs: from the day Bia's Coca was paid in
-- rls_test.sql, the group's menu becomes a Pix. (chests_test.sql moved everyone's joining date.)
update public.members set joined_on = sp_today() - 10 where user_id = '00000000-0000-0000-0000-000000000002';
insert into public.debt_menus (group_id, effective_from, items)
select '00000000-0000-0000-0000-0000000000a1', (select day from public.payments where debtor_id = '00000000-0000-0000-0000-000000000002' order by day limit 1), array['pix'];
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
set role authenticated;
do $$
declare d date := (select day from public.payments where debtor_id = '00000000-0000-0000-0000-000000000002' order by day limit 1);
begin
  begin
    insert into public.payments (debtor_id, day, item) values ('00000000-0000-0000-0000-000000000002', d, 'snack');
    raise exception 'FAIL: paid an item the day does not cost';
  exception when raise_exception then
    if sqlerrm not like '%item not owed%' then raise; end if;
  end;
  insert into public.payments (debtor_id, day, item) values ('00000000-0000-0000-0000-000000000002', d, 'pix');
end $$;
reset role;

select 'DEBT MENU TESTS PASSED' as result;
