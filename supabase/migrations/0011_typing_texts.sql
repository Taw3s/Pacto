-- Pacto — typing test over programming texts, continuing where you stopped. Run once, after 0010_typing_test.sql.
--
-- * A test is either random words ('words') or a text from the app's library ('text', src/lib/typing-texts.ts).
-- * typing_progress keeps, per person and text, how many words were already typed; the next test
--   starts there. Records are kept apart per mode; the day's points take the best test of any mode.

do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'typing_tests') then
    raise exception 'Rode supabase/migrations/0010_typing_test.sql antes deste arquivo.';
  end if;
end $$;

alter table public.typing_tests
  add column mode text not null default 'words' check (mode in ('words', 'text')),
  add column text_id text check (char_length(text_id) <= 60),
  add column start_word integer not null default 0 check (start_word >= 0),
  add column words_typed integer check (words_typed >= 0),
  add constraint typing_text_mode check ((mode = 'text') = (text_id is not null));

create table public.typing_progress (
  user_id uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  text_id text not null check (char_length(text_id) <= 60),
  words integer not null default 0 check (words >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, text_id)
);
alter table public.typing_progress enable row level security;
revoke all on public.typing_progress from anon, authenticated;
grant select on public.typing_progress to authenticated;
create policy "typing progress: own" on public.typing_progress for select to authenticated using (user_id = auth.uid());
grant select, insert, update on public.typing_progress to service_role;

-- New signatures (mode and text; words typed): replace the 0010 versions.
drop function public.start_typing_test(text);
drop function public.finish_typing_test(uuid, integer, integer);

/** Starts one of today's 3 tests. For a text, it starts where the person stopped last time. */
create or replace function public.start_typing_test(p_device text, p_mode text default 'words', p_text text default null)
returns table (test_id uuid, seconds integer, start_word integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
  v_id uuid;
  v_seconds integer := (select c.seconds from public.typing_config c);
  v_start integer := 0;
begin
  if v_group is null then
    raise exception 'not a member';
  end if;
  if p_device not in ('pc', 'mobile') then
    raise exception 'invalid device';
  end if;
  if p_mode not in ('words', 'text') or (p_mode = 'text') <> (p_text is not null) or char_length(coalesce(p_text, '')) > 60 then
    raise exception 'invalid mode';
  end if;
  if (select count(*) from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today()) >= 3 then
    raise exception 'no attempts left today';
  end if;
  if p_mode = 'text' then
    v_start := coalesce((select p.words from public.typing_progress p where p.user_id = auth.uid() and p.text_id = p_text), 0);
  end if;
  insert into public.typing_tests (user_id, group_id, day, device, seconds, mode, text_id, start_word)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds, p_mode, case when p_mode = 'text' then p_text end, v_start)
  returning id into v_id;
  return query select v_id, v_seconds, v_start;
end;
$$;

/**
 * Ends a test: the server checks the timing and computes wpm (5 characters = 1 word) and accuracy.
 * For a text, the words typed move the person's place forward (p_restart: they reached the end).
 */
create or replace function public.finish_typing_test(p_test uuid, p_correct integer, p_typed integer, p_words integer default 0, p_restart boolean default false)
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
  if p_words is null or p_words < 0 or p_words > p_typed then
    raise exception 'invalid result';
  end if;
  v_wpm := round((p_correct / 5.0) * 60 / t.seconds, 1);
  if v_wpm > 250 then
    raise exception 'implausible result';
  end if;
  v_acc := case when p_typed = 0 then 0 else round(p_correct::numeric / p_typed, 3) end;
  update public.typing_tests
  set finished_at = now(), correct_chars = p_correct, typed_chars = p_typed, words_typed = p_words,
      wpm = v_wpm, accuracy = v_acc, score = round(v_wpm * v_acc, 1)
  where id = p_test;
  if t.mode = 'text' then
    insert into public.typing_progress (user_id, text_id, words, updated_at)
    values (auth.uid(), t.text_id, case when p_restart then 0 else t.start_word + p_words end, now())
    on conflict (user_id, text_id) do update set words = excluded.words, updated_at = now();
  end if;
  return query select v_wpm, v_acc, round(v_wpm * v_acc, 1);
end;
$$;

revoke all on function public.start_typing_test(text, text, text), public.finish_typing_test(uuid, integer, integer, integer, boolean) from public, anon;
grant execute on function public.start_typing_test(text, text, text), public.finish_typing_test(uuid, integer, integer, integer, boolean) to authenticated;
