-- Pacto — chests, collection, weekly group challenge and push notifications.
-- Run once, after 0005_ai_judge.sql.
--
-- * Daily chest: whoever completes the 3 goals today opens one chest and wins a random
--   collectible. The draw happens here (security definer), never in the browser.
-- * Weekly challenge: when every member who was in the group on Monday has 5 completed
--   days in the week, each of them opens one rare-or-better chest.
-- * Push: browsers subscribe per device; the server (service_role) sends the notices.
--   The VAPID key pair lives in a service-only table, so there is nothing to configure.

-- ---------------------------------------------------------------------------
-- Collectibles and chests
-- ---------------------------------------------------------------------------
create table public.collectibles (
  id text primary key,
  rarity text not null check (rarity in ('comum', 'raro', 'lendario')),
  weight integer not null check (weight > 0) -- relative chance in a daily chest
);

insert into public.collectibles (id, rarity, weight) values
  ('plant', 'comum', 20), ('mug', 'comum', 20), ('duck', 'comum', 20),
  ('cat', 'raro', 10), ('lamp', 'raro', 10), ('globe', 'raro', 10),
  ('goldBook', 'lendario', 5), ('crown', 'lendario', 5);

create table public.chest_openings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.members (user_id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  kind text not null check (kind in ('daily', 'weekly')),
  period date not null, -- the day (daily) or the Monday of the week (weekly)
  item_id text not null references public.collectibles (id),
  created_at timestamptz not null default now(),
  unique (user_id, kind, period)
);
create index chest_openings_group_idx on public.chest_openings (group_id);

alter table public.collectibles enable row level security;
alter table public.chest_openings enable row level security;
revoke all on public.collectibles, public.chest_openings from anon, authenticated;
grant select on public.collectibles, public.chest_openings to authenticated;

create policy "collectibles: read" on public.collectibles for select to authenticated using (true);
create policy "chests: read same group" on public.chest_openings
  for select to authenticated using (group_id = public.my_group_id());

/** Completed days per eligible member in the week starting p_week (members in the group on Monday). */
create or replace function public.weekly_progress(p_group uuid, p_week date)
returns table (user_id uuid, done_days bigint)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, count(c.day)
  from public.members m
  left join public.completed_days c
    on c.user_id = m.user_id and c.day between p_week and p_week + 6 and c.day <= public.sp_today()
  where m.group_id = p_group and m.joined_on <= p_week
  group by m.user_id
$$;
revoke all on function public.weekly_progress(uuid, date) from public, anon, authenticated;

/**
 * Opens today's daily chest or this week's chest for the caller, at most once per period.
 * Returns the item (the same one when called again).
 */
create or replace function public.open_chest(p_kind text)
returns table (item_id text, rarity text, already boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_group uuid;
  v_joined date;
  v_period date;
  v_item text;
  v_existing text;
begin
  select group_id, joined_on into v_group, v_joined from public.members where user_id = v_user;
  if v_group is null then
    raise exception 'not a member';
  end if;

  if p_kind = 'daily' then
    v_period := public.sp_today();
    if not exists (select 1 from public.completed_days where user_id = v_user and day = v_period) then
      raise exception 'day not complete';
    end if;
  elsif p_kind = 'weekly' then
    v_period := date_trunc('week', public.sp_today())::date;
    if v_joined > v_period then
      raise exception 'joined after the week started';
    end if;
    if exists (select 1 from public.weekly_progress(v_group, v_period) w where w.done_days < 5) then
      raise exception 'weekly challenge not complete';
    end if;
  else
    raise exception 'invalid chest';
  end if;

  select o.item_id into v_existing from public.chest_openings o
  where o.user_id = v_user and o.kind = p_kind and o.period = v_period;
  if v_existing is not null then
    return query select v_existing, c.rarity, true from public.collectibles c where c.id = v_existing;
    return;
  end if;

  -- Weighted draw (Efraimidis–Spirakis); the weekly chest only holds rare or legendary items.
  select c.id into v_item from public.collectibles c
  where p_kind = 'daily' or c.rarity <> 'comum'
  order by -ln(1 - random()) / c.weight
  limit 1;

  insert into public.chest_openings (user_id, group_id, kind, period, item_id)
  values (v_user, v_group, p_kind, v_period, v_item)
  on conflict (user_id, kind, period) do nothing;

  -- A concurrent call may have won the race: return whatever is stored.
  return query
    select o.item_id, c.rarity, o.item_id <> v_item
    from public.chest_openings o join public.collectibles c on c.id = o.item_id
    where o.user_id = v_user and o.kind = p_kind and o.period = v_period;
end;
$$;
revoke all on function public.open_chest(text) from public, anon;
grant execute on function public.open_chest(text) to authenticated;

/** Week progress of the caller's group (for the challenge card). */
create or replace function public.my_weekly_progress()
returns table (user_id uuid, done_days bigint)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.weekly_progress(public.my_group_id(), date_trunc('week', public.sp_today())::date)
$$;
revoke all on function public.my_weekly_progress() from public, anon;
grant execute on function public.my_weekly_progress() to authenticated;

-- ---------------------------------------------------------------------------
-- Push notifications
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  -- https push services; http://127.0.0.1 only exists for the local test push server (the app refuses to send to it in production).
  endpoint text not null unique check ((endpoint like 'https://%' or endpoint like 'http://127.0.0.1:%') and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant insert (endpoint, p256dh, auth) on public.push_subscriptions to authenticated;

create policy "push: own rows" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy "push: subscribe self" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
create policy "push: unsubscribe self" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- The VAPID key pair (generated by the server on first use). Never readable by members.
create table public.push_config (
  id boolean primary key default true check (id),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

-- One notice per person, kind and day (stops duplicates and repeated cron calls).
create table public.notification_log (
  user_id uuid not null references public.members (user_id) on delete cascade,
  kind text not null check (char_length(kind) <= 80), -- e.g. 'reminder', 'weekly-chest', 'nudge:<user id>'
  day date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, day)
);
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;

grant select, insert, update, delete on public.push_subscriptions, public.push_config, public.notification_log to service_role;
grant select on public.chest_openings, public.collectibles to service_role;
grant execute on function public.weekly_progress(uuid, date) to service_role;
