-- Bind the mutation result to the group whose media the server is allowed to clean.
do $$ begin
  if not exists(select 1 from pg_trigger where tgrelid='public.checkins'::regclass and tgname='checkins_00_serialize_insert') then
    raise exception 'Apply 0023_atomic_membership_and_proofs.sql first';
  end if;
end $$;

create function public.change_membership(p_group uuid, p_action text, p_user uuid default null)
returns text language plpgsql security definer set search_path = public as $$
begin
  if p_group is null or public.my_group_id() is distinct from p_group then
    raise exception 'membership changed';
  end if;
  perform pg_advisory_xact_lock(hashtext('group:' || p_group::text));
  if public.my_group_id() is distinct from p_group then raise exception 'membership changed'; end if;
  if p_action='leave' then
    if p_user is not null and p_user<>auth.uid() then raise exception 'invalid target'; end if;
    return public.leave_group();
  elsif p_action='remove' then
    return public.remove_member(p_user);
  end if;
  raise exception 'invalid action';
end;
$$;
revoke all on function public.change_membership(uuid,text,uuid) from public,anon;
grant execute on function public.change_membership(uuid,text,uuid) to authenticated;
