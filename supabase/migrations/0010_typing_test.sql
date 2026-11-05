-- Pacto — the typing goal becomes a typing test inside the app. Run once, after 0009_photo_date_reactions.sql.
--
-- * Up to 3 tests a day; the best one scores (wpm × accuracy). PC and phone are kept apart.
-- * The server times every test (start/finish) and computes the result: the browser only reports
--   how many characters were typed and how many were right. Implausible results are refused.
-- * A typing check-in must point to one of the day's finished tests (no more photo proofs). The app
--   still attaches a picture of the result card, so lists and the tribunal keep working.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'checkins' and column_name = 'photo_taken_at') then
    raise exception 'Rode supabase/migrations/0009_photo_date_reactions.sql antes deste arquivo.';
  end if;
end $$;

-- Test length in seconds (60). Only the end-to-end tests change it, to keep them fast.
create table public.typing_config (
  id boolean primary key default true check (id),
  seconds integer not null default 60 check (seconds between 1 and 300)
);
insert into public.typing_config default values;
alter table public.typing_config enable row level security;
revoke all on public.typing_config from anon, authenticated;

create table public.typing_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.members (user_id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  day date not null,
  device text not null check (device in ('pc', 'mobile')),
  seconds integer not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  correct_chars integer check (correct_chars >= 0),
  typed_chars integer check (typed_chars >= 0),
  wpm numeric(5, 1),
  accuracy numeric(4, 3),
  score numeric(6, 1)
);
create index typing_tests_user_day_idx on public.typing_tests (user_id, day);
create index typing_tests_group_day_idx on public.typing_tests (group_id, day);

alter table public.typing_tests enable row level security;
revoke all on public.typing_tests from anon, authenticated;
grant select on public.typing_tests to authenticated;
create policy "typing: read same group" on public.typing_tests
  for select to authenticated using (group_id = public.my_group_id());

/** Starts one of today's 3 tests. Returns the test id and its length in seconds. */
create or replace function public.start_typing_test(p_device text)
returns table (test_id uuid, seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
  v_id uuid;
  v_seconds integer := (select c.seconds from public.typing_config c);
begin
  if v_group is null then
    raise exception 'not a member';
  end if;
  if p_device not in ('pc', 'mobile') then
    raise exception 'invalid device';
  end if;
  if (select count(*) from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today()) >= 3 then
    raise exception 'no attempts left today';
  end if;
  insert into public.typing_tests (user_id, group_id, day, device, seconds)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds)
  returning id into v_id;
  return query select v_id, v_seconds;
end;
$$;

/** Ends a test: the server checks the timing and computes wpm (5 characters = 1 word) and accuracy. */
create or replace function public.finish_typing_test(p_test uuid, p_correct integer, p_typed integer)
returns table (wpm numeric, accuracy numeric, score numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.typing_tests;
  v_elapsed numeric;
  v_wpm numeric;
  v_acc numeric;
begin
  select * into t from public.typing_tests where id = p_test and user_id = auth.uid() for update;
  if not found then
    raise exception 'test not found';
  end if;
  if t.finished_at is not null then
    raise exception 'test already finished';
  end if;
  v_elapsed := extract(epoch from now() - t.started_at);
  -- Ended neither early (a faked clock) nor long after (left open and finished later).
  if v_elapsed < t.seconds - 2 or v_elapsed > t.seconds * 2 + 30 then
    raise exception 'test timing out of range';
  end if;
  if p_typed is null or p_correct is null or p_typed < 0 or p_correct < 0 or p_correct > p_typed or p_typed > t.seconds * 25 then
    raise exception 'invalid result';
  end if;
  v_wpm := round((p_correct / 5.0) * 60 / t.seconds, 1);
  if v_wpm > 250 then
    raise exception 'implausible result';
  end if;
  v_acc := case when p_typed = 0 then 0 else round(p_correct::numeric / p_typed, 3) end;
  update public.typing_tests
  set finished_at = now(), correct_chars = p_correct, typed_chars = p_typed,
      wpm = v_wpm, accuracy = v_acc, score = round(v_wpm * v_acc, 1)
  where id = p_test;
  return query select v_wpm, v_acc, round(v_wpm * v_acc, 1);
end;
$$;

revoke all on function public.start_typing_test(text), public.finish_typing_test(uuid, integer, integer) from public, anon;
grant execute on function public.start_typing_test(text), public.finish_typing_test(uuid, integer, integer) to authenticated;

-- A typing check-in points to a finished test of its owner, from the same day, used once.
alter table public.checkins add column typing_test_id uuid unique references public.typing_tests (id) on delete set null;
grant insert (typing_test_id) on public.checkins to authenticated;

create or replace function public.checkins_typing_test()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.goal::text <> 'typing' then
    new.typing_test_id := null;
    return new;
  end if;
  if new.typing_test_id is null or not exists (
    select 1 from public.typing_tests t
    where t.id = new.typing_test_id and t.user_id = new.user_id and t.day = new.day and t.finished_at is not null
  ) then
    raise exception 'typing needs a finished test from today';
  end if;
  return new;
end;
$$;
-- Runs after checkins_before_insert (alphabetical order), which sets user_id and day.
create trigger checkins_typing_test
  before insert on public.checkins
  for each row execute function public.checkins_typing_test();

grant select on public.typing_tests to service_role;
