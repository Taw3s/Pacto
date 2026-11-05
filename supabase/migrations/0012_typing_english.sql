-- Pacto — typing test in English too. Run once, after 0011_typing_texts.sql.
--
-- * Every test has a language: 'pt' (default) or 'en', for random words and for texts alike.
--   English texts have ids starting with 'en-' (src/lib/typing-texts.ts).
-- * Records are kept apart per language; the day's points still take the best test of any kind.

do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'typing_progress') then
    raise exception 'Rode supabase/migrations/0011_typing_texts.sql antes deste arquivo.';
  end if;
end $$;

alter table public.typing_tests add column lang text not null default 'pt' check (lang in ('pt', 'en'));

drop function public.start_typing_test(text, text, text);

/** Starts one of today's 3 tests. For a text, it starts where the person stopped last time. */
create or replace function public.start_typing_test(p_device text, p_mode text default 'words', p_text text default null, p_lang text default 'pt')
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
  -- An English text is an 'en-' text, and only an English test types it.
  if p_lang not in ('pt', 'en') or (p_mode = 'text' and (p_text like 'en-%') <> (p_lang = 'en')) then
    raise exception 'invalid language';
  end if;
  if (select count(*) from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today()) >= 3 then
    raise exception 'no attempts left today';
  end if;
  if p_mode = 'text' then
    v_start := coalesce((select p.words from public.typing_progress p where p.user_id = auth.uid() and p.text_id = p_text), 0);
  end if;
  insert into public.typing_tests (user_id, group_id, day, device, seconds, mode, text_id, start_word, lang)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds, p_mode, case when p_mode = 'text' then p_text end, v_start, p_lang)
  returning id into v_id;
  return query select v_id, v_seconds, v_start;
end;
$$;

revoke all on function public.start_typing_test(text, text, text, text) from public, anon;
grant execute on function public.start_typing_test(text, text, text, text) to authenticated;
