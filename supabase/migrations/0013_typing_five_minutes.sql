-- Pacto — a 5-minute typing test next to the 1-minute one. Run once, after 0012_typing_english.sql.
--
-- * Each test lasts 1 or 5 "minutes": typing_config.seconds is one minute (60; the E2E tests shrink it).
-- * The same 3 attempts a day; the day's points still take the best test, whatever its length.
-- * A long test can run past the end of a text: the place then wraps to where the person stopped
--   in the next pass (p_text_words is the text's length).

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'typing_tests' and column_name = 'lang') then
    raise exception 'Rode supabase/migrations/0012_typing_english.sql antes deste arquivo.';
  end if;
end $$;

alter table public.typing_tests add column minutes smallint not null default 1 check (minutes in (1, 5));

drop function public.start_typing_test(text, text, text, text);
drop function public.finish_typing_test(uuid, integer, integer, integer, boolean);

/** Starts one of today's 3 tests (1 or 5 minutes). For a text, it starts where the person stopped. */
create or replace function public.start_typing_test(p_device text, p_mode text default 'words', p_text text default null, p_lang text default 'pt', p_minutes integer default 1)
returns table (test_id uuid, seconds integer, start_word integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid := public.my_group_id();
  v_id uuid;
  v_seconds integer;
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
  -- An English text is an 'en-' text, and only an English test types it.
  if p_lang not in ('pt', 'en') or (p_mode = 'text' and (p_text like 'en-%') <> (p_lang = 'en')) then
    raise exception 'invalid language';
  end if;
  if p_minutes is null or p_minutes not in (1, 5) then
    raise exception 'invalid length';
  end if;
  if (select count(*) from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today()) >= 3 then
    raise exception 'no attempts left today';
  end if;
  if p_mode = 'text' then
    v_start := coalesce((select p.words from public.typing_progress p where p.user_id = auth.uid() and p.text_id = p_text), 0);
  end if;
  v_seconds := (select c.seconds from public.typing_config c) * p_minutes;
  insert into public.typing_tests (user_id, group_id, day, device, seconds, mode, text_id, start_word, lang, minutes)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds, p_mode, case when p_mode = 'text' then p_text end, v_start, p_lang, p_minutes)
  returning id into v_id;
  return query select v_id, v_seconds, v_start;
end;
$$;

/**
 * Ends a test: the server checks the timing and computes wpm (5 characters = 1 word) and accuracy.
 * For a text, the words typed move the person's place forward, wrapping at p_text_words (old
 * clients send p_restart instead: back to the start).
 */
create or replace function public.finish_typing_test(p_test uuid, p_correct integer, p_typed integer, p_words integer default 0, p_restart boolean default false, p_text_words integer default null)
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
  v_place integer;
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
  if p_words is null or p_words < 0 or p_words > p_typed or (p_text_words is not null and p_text_words < 1) then
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
    v_place := case
      when p_text_words is not null then (t.start_word + p_words) % p_text_words
      when p_restart then 0
      else t.start_word + p_words
    end;
    insert into public.typing_progress (user_id, text_id, words, updated_at)
    values (auth.uid(), t.text_id, v_place, now())
    on conflict (user_id, text_id) do update set words = excluded.words, updated_at = now();
  end if;
  return query select v_wpm, v_acc, round(v_wpm * v_acc, 1);
end;
$$;

revoke all on function public.start_typing_test(text, text, text, text, integer), public.finish_typing_test(uuid, integer, integer, integer, boolean, integer) from public, anon;
grant execute on function public.start_typing_test(text, text, text, text, integer), public.finish_typing_test(uuid, integer, integer, integer, boolean, integer) to authenticated;
