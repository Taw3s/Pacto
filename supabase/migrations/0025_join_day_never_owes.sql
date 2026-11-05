-- The join day never owes: whoever joins at 22h is not in debt at 23:59. Done, it still counts (streak, chests).
-- Only the payment check changes: debts are derived in src/lib/ledger.ts (keep both in sync).
do $$ begin
  if to_regprocedure('public.change_membership(uuid,text,uuid)') is null then
    raise exception 'Apply 0024_bound_membership_cleanup.sql first';
  end if;
end $$;

-- Same as 0016, except the join day is not payable.
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
  new.received_name := (select display_name from public.members where user_id = new.received_by);

  if new.debtor_id = new.received_by then
    raise exception 'cannot mark your own debt as paid';
  end if;
  select joined_on into v_joined from public.members
  where user_id = new.debtor_id and group_id = new.group_id;
  if not found then
    raise exception 'debtor not in your group';
  end if;
  if new.day >= public.sp_today() or new.day <= v_joined then
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
