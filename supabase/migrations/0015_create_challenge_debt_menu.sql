-- Pacto — create a challenge (group) in the app, with a debt menu. Run once, after 0014_ai_review_limits.sql.
--
-- * Anyone signed in without a group can create one: they become its owner and get the invite code.
-- * Each missed day costs 1 or 2 items from a fixed menu (Coca, salgado, café, chocolate, açaí,
--   pizza, sorvete, Pix de R$ 5). The menu of existing groups stays 1 Coca + 1 salgado.
-- * Only the owner changes the menu, and a change applies from the next Monday: days already
--   missed keep the items they had. src/lib/debt-items.ts and src/lib/ledger.ts mirror this.
-- * Existing groups get as owner their first member (change it with the update below if needed).

do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'ai_review_attempts') then
    raise exception 'Rode supabase/migrations/0014_ai_review_limits.sql antes deste arquivo.';
  end if;
end $$;

-- Items are stored as text (a menu id) instead of the old two-value enum.
alter table public.payments alter column item type text using item::text;
drop type public.debt_item;
alter table public.payments add constraint payments_item_check
  check (item in ('coke', 'snack', 'coffee', 'chocolate', 'acai', 'pizza', 'icecream', 'pix'));

create or replace function public.debt_menu_ok(p_items text[])
returns boolean
language sql
immutable
as $$
  select p_items is not null
    and cardinality(p_items) between 1 and 2
    and p_items <@ array['coke', 'snack', 'coffee', 'chocolate', 'acai', 'pizza', 'icecream', 'pix']
    and (cardinality(p_items) = 1 or p_items[1] <> p_items[2])
$$;

create table public.debt_menus (
  group_id uuid not null references public.groups (id) on delete cascade,
  effective_from date not null,
  items text[] not null check (public.debt_menu_ok(items)),
  created_at timestamptz not null default now(),
  primary key (group_id, effective_from)
);
alter table public.debt_menus enable row level security;
revoke all on public.debt_menus from anon, authenticated;
grant select on public.debt_menus to authenticated;
grant select on public.debt_menus to service_role;
create policy "debt menus: read same group" on public.debt_menus
  for select to authenticated using (group_id = public.my_group_id());

insert into public.debt_menus (group_id, effective_from, items)
select id, date '2000-01-01', array['coke', 'snack'] from public.groups;

alter table public.groups add column owner_id uuid references auth.users (id) on delete set null;
update public.groups g set owner_id = (
  select m.user_id from public.members m where m.group_id = g.id order by m.joined_on, m.created_at limit 1
);

/** The items a missed day costs in a group (the menu in force on that day). */
create or replace function public.debt_items_on(p_group uuid, p_day date)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select items from public.debt_menus where group_id = p_group and effective_from <= p_day order by effective_from desc limit 1),
    array['coke', 'snack'])
$$;

-- A payment can only settle a day that really was missed, and only an item that day costs.
-- Mirrors src/lib/ledger.ts (keep both in sync).
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_joined date;
begin
  new.received_by := auth.uid();
  new.group_id := public.my_group_id();
  new.paid_at := now();

  if new.debtor_id = new.received_by then
    raise exception 'cannot mark your own debt as paid';
  end if;
  select joined_on into v_joined from public.members
  where user_id = new.debtor_id and group_id = new.group_id;
  if not found then
    raise exception 'debtor not in your group';
  end if;
  if new.day >= public.sp_today() or new.day < v_joined then
    raise exception 'day is not payable';
  end if;
  if extract(dow from new.day)::smallint = public.day_off_for(new.debtor_id, new.day) then
    raise exception 'day off';
  end if;
  if exists (select 1 from public.completed_days where user_id = new.debtor_id and day = new.day) then
    raise exception 'day was completed';
  end if;
  if not (new.item = any (public.debt_items_on(new.group_id, new.day))) then
    raise exception 'item not owed that day';
  end if;
  return new;
end;
$$;

/** A signed-in person without a group creates one and becomes its owner. Returns the invite code. */
create or replace function public.create_group(p_name text, p_display_name text, p_items text[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'already a member';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 1 and 40 or char_length(trim(coalesce(p_display_name, ''))) not between 1 and 40 then
    raise exception 'invalid name';
  end if;
  if not public.debt_menu_ok(p_items) then
    raise exception 'invalid menu';
  end if;
  -- 8 characters without look-alikes (0/O, 1/I).
  loop
    v_code := (select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '') from generate_series(1, 8));
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;
  insert into public.groups (name, invite_code, owner_id) values (trim(p_name), v_code, auth.uid()) returning id into v_group;
  insert into public.debt_menus (group_id, effective_from, items) values (v_group, public.sp_today(), p_items);
  perform public._add_member(auth.uid(), v_group, p_display_name);
  return v_code;
end;
$$;

/** The owner changes the debt menu; it applies from the next Monday. Returns that Monday. */
create or replace function public.set_debt_menu(p_items text[])
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
  v_from date := public.sp_today() + (8 - extract(isodow from public.sp_today())::int);
begin
  if v_group is null or not exists (select 1 from public.groups where id = v_group and owner_id = auth.uid()) then
    raise exception 'only the owner changes the menu';
  end if;
  if not public.debt_menu_ok(p_items) then
    raise exception 'invalid menu';
  end if;
  insert into public.debt_menus (group_id, effective_from, items) values (v_group, v_from, p_items)
  on conflict (group_id, effective_from) do update set items = excluded.items, created_at = now();
  return v_from;
end;
$$;

revoke all on function public.create_group(text, text, text[]), public.set_debt_menu(text[]), public.debt_items_on(uuid, date) from public, anon;
grant execute on function public.create_group(text, text, text[]), public.set_debt_menu(text[]), public.debt_items_on(uuid, date) to authenticated;
