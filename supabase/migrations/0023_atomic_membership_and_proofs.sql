-- Recheck permissions after waiting for a group mutation; serialize proof quotas per user.
do $$ begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='typing_tests' and column_name='progress_version') then
    raise exception 'Apply 0022_typing_progress_integrity.sql first';
  end if;
end $$;

create or replace function public._drop_member(p_user uuid, p_group uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_next uuid;
begin
  perform pg_advisory_xact_lock(hashtext('group:' || p_group::text));
  if not exists(select 1 from public.members where user_id=p_user and group_id=p_group) then
    raise exception 'not a member of this group';
  end if;
  select m.user_id into v_next from public.members m
  where m.group_id=p_group and m.user_id<>p_user
  order by m.joined_on,m.created_at limit 1;
  if v_next is null then
    delete from public.groups where id=p_group;
    return 'closed';
  end if;
  update public.groups set owner_id=v_next where id=p_group and owner_id=p_user;
  delete from public.members where user_id=p_user and group_id=p_group;
  return 'left';
end;
$$;

create or replace function public.leave_group()
returns text language plpgsql security definer set search_path = public as $$
declare v_group uuid := public.my_group_id();
begin
  if v_group is null then raise exception 'not a member'; end if;
  perform pg_advisory_xact_lock(hashtext('group:' || v_group::text));
  if public.my_group_id() is distinct from v_group then raise exception 'not a member'; end if;
  return public._drop_member(auth.uid(),v_group);
end;
$$;

create or replace function public.remove_member(p_user uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_group uuid := public.my_group_id();
begin
  if v_group is null then raise exception 'only the owner removes members'; end if;
  perform pg_advisory_xact_lock(hashtext('group:' || v_group::text));
  if public.my_group_id() is distinct from v_group or not exists(select 1 from public.groups where id=v_group and owner_id=auth.uid()) then
    raise exception 'only the owner removes members';
  end if;
  if p_user=auth.uid() then raise exception 'use leave_group'; end if;
  if not exists(select 1 from public.members where user_id=p_user and group_id=v_group) then raise exception 'not in your group'; end if;
  return public._drop_member(p_user,v_group);
end;
$$;

create function public.serialize_checkin_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('checkin:' || auth.uid()::text));
  return new;
end;
$$;
revoke all on function public.serialize_checkin_insert() from public,anon,authenticated;
-- Trigger names are ordered: obtain the lock before the existing quota/retake checks.
create trigger checkins_00_serialize_insert before insert on public.checkins
for each row execute function public.serialize_checkin_insert();

revoke all on function public._drop_member(uuid,uuid) from public,anon,authenticated;
grant execute on function public._drop_member(uuid,uuid) to service_role;
revoke all on function public.leave_group(), public.remove_member(uuid) from public,anon;
grant execute on function public.leave_group(), public.remove_member(uuid) to authenticated;
