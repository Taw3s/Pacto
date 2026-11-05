-- Fixes from the security audit of 29/10/2026 (round 1):
--   1. Removing a member rotates the group's invite code, so the removed person cannot rejoin with the old one.
--   2. AI review attempts outlive the proof, so leaving and recreating a group does not reset the daily quota.
--   3. The AI judge only opens a tribunal for proofs from today or yesterday, the same window as members.
do $$ begin
  if position('new.day <= v_joined' in pg_get_functiondef('public.payments_before_insert()'::regprocedure)) = 0 then
    raise exception 'Apply 0025_join_day_never_owes.sql first';
  end if;
end $$;

-- 8 characters without look-alikes (0/O, 1/I), drawn from gen_random_uuid() (CSPRNG) instead of random().
create or replace function public._new_invite_code()
returns text language plpgsql volatile set search_path = public as $$
declare v_code text; v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_bytes bytea;
begin
  loop
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    select string_agg(substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1), '' order by i) into v_code from generate_series(0, 7) i;
    exit when not exists (select 1 from public.groups where invite_code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke all on function public._new_invite_code() from public, anon, authenticated;

-- Same as 0015, with the code from _new_invite_code().
create or replace function public.create_group(p_name text, p_display_name text, p_items text[])
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_code text;
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
  v_code := public._new_invite_code();
  insert into public.groups (name, invite_code, owner_id) values (trim(p_name), v_code, auth.uid()) returning id into v_group;
  insert into public.debt_menus (group_id, effective_from, items) values (v_group, public.sp_today(), p_items);
  perform public._add_member(auth.uid(), v_group, p_display_name);
  return v_code;
end;
$$;

-- Same as 0023, plus a new invite code: everyone sees the code, so the removed person already has the old one.
create or replace function public.remove_member(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_group uuid := public.my_group_id(); v_result text;
begin
  if v_group is null then raise exception 'only the owner removes members'; end if;
  perform pg_advisory_xact_lock(hashtext('group:' || v_group::text));
  if public.my_group_id() is distinct from v_group or not exists(select 1 from public.groups where id=v_group and owner_id=auth.uid()) then
    raise exception 'only the owner removes members';
  end if;
  if p_user=auth.uid() then raise exception 'use leave_group'; end if;
  if not exists(select 1 from public.members where user_id=p_user and group_id=v_group) then raise exception 'not in your group'; end if;
  v_result := public._drop_member(p_user,v_group);
  if v_result = 'left' then
    update public.groups set invite_code = public._new_invite_code() where id = v_group;
  end if;
  return v_result;
end;
$$;

-- The daily per-person count (claim_ai_review) must not shrink when the proof is deleted with the group.
alter table public.ai_review_attempts alter column checkin_id drop not null;
alter table public.ai_review_attempts drop constraint ai_review_attempts_checkin_id_fkey;
alter table public.ai_review_attempts add constraint ai_review_attempts_checkin_id_fkey
  foreign key (checkin_id) references public.checkins (id) on delete set null;

-- A mismatch on an old proof is recorded but opens no tribunal (members can only dispute today or yesterday).
create or replace function public.checkin_reviews_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verdict = 'mismatch' and exists (select 1 from public.checkins where id = new.checkin_id and day >= public.sp_today() - 1) then
    insert into public.disputes (checkin_id, reason, by_ai)
    values (new.checkin_id, left('Juiz IA: a foto não confere com a meta. Viu: ' || new.seen, 280), true)
    on conflict (checkin_id) do nothing;
  end if;
  return new;
end;
$$;
