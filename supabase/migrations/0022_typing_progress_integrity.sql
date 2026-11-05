-- Server-owned text lengths and progress revisions. Existing scores are unchanged.
-- Canonical catalog generated from the shipped Portuguese and English text modules.
do $$ begin
  if to_regclass('public.media_cleanup_jobs') is null then
    raise exception 'Apply 0021_retry_media_cleanup.sql first';
  end if;
end $$;
create table public.typing_text_catalog (
  id text primary key,
  lang text not null check (lang in ('pt','en')),
  word_count integer not null check (word_count > 0)
);
alter table public.typing_text_catalog enable row level security;
revoke all on public.typing_text_catalog from public, anon, authenticated;
grant select on public.typing_text_catalog to service_role;
insert into public.typing_text_catalog(id, lang, word_count) values
  ('algoritmo', 'pt', 143),
  ('variavel', 'pt', 139),
  ('funcao', 'pt', 143),
  ('complexidade', 'pt', 134),
  ('api', 'pt', 123),
  ('http', 'pt', 129),
  ('git', 'pt', 124),
  ('compilador-interpretador', 'pt', 127),
  ('nuvem', 'pt', 127),
  ('senhas', 'pt', 126),
  ('sql-o-que-e', 'pt', 126),
  ('sql-chaves', 'pt', 132),
  ('sql-indices', 'pt', 132),
  ('sql-transacoes', 'pt', 121),
  ('python-intro', 'pt', 133),
  ('python-listas', 'pt', 127),
  ('js-intro', 'pt', 124),
  ('js-assincrono', 'pt', 126),
  ('html-css', 'pt', 130),
  ('web-navegador', 'pt', 127),
  ('redes', 'pt', 139),
  ('terminal', 'pt', 145),
  ('testes', 'pt', 146),
  ('seguranca', 'pt', 143),
  ('sql-joins', 'pt', 149),
  ('sql-group-by', 'pt', 140),
  ('sql-subconsultas', 'pt', 139),
  ('sql-normalizacao', 'pt', 139),
  ('sql-nulo', 'pt', 138),
  ('sql-nosql', 'pt', 141),
  ('python-funcoes', 'pt', 140),
  ('python-classes', 'pt', 137),
  ('python-compreensoes', 'pt', 137),
  ('python-venv', 'pt', 135),
  ('python-excecoes', 'pt', 137),
  ('python-pandas', 'pt', 138),
  ('js-closures', 'pt', 143),
  ('js-dom', 'pt', 135),
  ('web-rest', 'pt', 144),
  ('web-react', 'pt', 132),
  ('ts-intro', 'pt', 148),
  ('ts-tipos-basicos', 'pt', 144),
  ('ts-interfaces', 'pt', 140),
  ('ts-unioes', 'pt', 139),
  ('ts-genericos', 'pt', 140),
  ('ts-strict', 'pt', 138),
  ('ts-inferencia', 'pt', 143),
  ('ts-literais', 'pt', 138),
  ('ts-tsconfig', 'pt', 133),
  ('ts-utilitarios', 'pt', 134),
  ('java-jvm', 'pt', 144),
  ('java-classes', 'pt', 131),
  ('java-heranca', 'pt', 136),
  ('java-colecoes', 'pt', 140),
  ('java-excecoes', 'pt', 135),
  ('java-streams', 'pt', 137),
  ('java-memoria', 'pt', 142),
  ('java-spring', 'pt', 141),
  ('java-build', 'pt', 140),
  ('java-tipos', 'pt', 144),
  ('en-algorithm', 'en', 150),
  ('en-variables', 'en', 140),
  ('en-functions', 'en', 133),
  ('en-complexity', 'en', 138),
  ('en-api', 'en', 129),
  ('en-http', 'en', 140),
  ('en-git', 'en', 128),
  ('en-compiler-interpreter', 'en', 142),
  ('en-cloud', 'en', 128),
  ('en-passwords', 'en', 127),
  ('en-sql-what', 'en', 136),
  ('en-sql-keys', 'en', 142),
  ('en-sql-indexes', 'en', 136),
  ('en-sql-transactions', 'en', 126),
  ('en-python-intro', 'en', 128),
  ('en-python-collections', 'en', 130),
  ('en-js-intro', 'en', 116),
  ('en-js-async', 'en', 131),
  ('en-html-css', 'en', 135),
  ('en-web-browser', 'en', 134),
  ('en-networks', 'en', 137),
  ('en-terminal', 'en', 153),
  ('en-testing', 'en', 147),
  ('en-injection', 'en', 149),
  ('en-sql-joins', 'en', 152),
  ('en-sql-group-by', 'en', 153),
  ('en-sql-subqueries', 'en', 150),
  ('en-sql-normalization', 'en', 141),
  ('en-sql-null', 'en', 140),
  ('en-sql-nosql', 'en', 144),
  ('en-python-functions', 'en', 141),
  ('en-python-classes', 'en', 142),
  ('en-python-comprehensions', 'en', 139),
  ('en-python-venv', 'en', 133),
  ('en-python-exceptions', 'en', 142),
  ('en-python-pandas', 'en', 136),
  ('en-js-closures', 'en', 142),
  ('en-js-dom', 'en', 143),
  ('en-web-rest', 'en', 142),
  ('en-web-react', 'en', 134),
  ('en-ts-intro', 'en', 146),
  ('en-ts-basic-types', 'en', 149),
  ('en-ts-interfaces', 'en', 132),
  ('en-ts-unions', 'en', 147),
  ('en-ts-generics', 'en', 143),
  ('en-ts-strict', 'en', 145),
  ('en-ts-inference', 'en', 150),
  ('en-ts-literals', 'en', 137),
  ('en-ts-tsconfig', 'en', 133),
  ('en-ts-utility-types', 'en', 135),
  ('en-java-jvm', 'en', 145),
  ('en-java-classes', 'en', 132),
  ('en-java-inheritance', 'en', 133),
  ('en-java-collections', 'en', 141),
  ('en-java-exceptions', 'en', 148),
  ('en-java-streams', 'en', 133),
  ('en-java-memory', 'en', 153),
  ('en-java-spring', 'en', 133),
  ('en-java-build', 'en', 140),
  ('en-java-types', 'en', 131);

alter table public.typing_progress add column version bigint not null default 0;
alter table public.typing_tests add column progress_version bigint not null default 0;
alter table public.typing_tests add column text_word_count integer check (text_word_count > 0);
-- Attempts started before this upgrade may already be older than the saved place.
update public.typing_tests t set progress_version=-1
from public.typing_progress p
where t.mode='text' and t.finished_at is null and p.user_id=t.user_id
  and p.text_id=t.text_id and p.updated_at>t.started_at;
update public.typing_tests t set text_word_count=c.word_count
from public.typing_text_catalog c where t.mode='text' and t.text_id=c.id and t.lang=c.lang;

-- Start and finish share the user's lock. A stale version cannot overwrite a newer place.
-- p_restart remains in the signature for compatibility; wrapping uses the stored text length.
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
  v_text_words integer;
  v_version bigint := 0;
begin
  -- Serialize each user's daily quota check and insertion, across different requests.
  perform pg_advisory_xact_lock(hashtext('typing-start:' || auth.uid()::text));
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
  if p_mode = 'text' then
    select c.word_count into v_text_words from public.typing_text_catalog c where c.id = p_text and c.lang = p_lang;
    if not found then raise exception 'invalid text'; end if;
  end if;
  if (select count(*) from public.typing_tests t where t.user_id = auth.uid() and t.day = public.sp_today()) >= 3 then
    raise exception 'no attempts left today';
  end if;
  if p_mode = 'text' then
    select p.words, p.version into v_start, v_version from public.typing_progress p where p.user_id = auth.uid() and p.text_id = p_text;
    v_start := coalesce(v_start, 0);
    v_version := coalesce(v_version, 0);
  end if;
  v_seconds := (select c.seconds from public.typing_config c) * p_minutes;
  insert into public.typing_tests (user_id, group_id, day, device, seconds, mode, text_id, start_word, lang, minutes, text_word_count, progress_version)
  values (auth.uid(), v_group, public.sp_today(), p_device, v_seconds, p_mode, case when p_mode = 'text' then p_text end, v_start, p_lang, p_minutes, v_text_words, v_version)
  returning id into v_id;
  return query select v_id, v_seconds, v_start;
end;
$$;

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
  v_total integer;
  v_version bigint;
begin
  perform pg_advisory_xact_lock(hashtext('typing-start:' || auth.uid()::text));
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
  if p_words is null or p_words < 0 or p_words > p_typed / 2 or (p_text_words is not null and p_text_words < 1) then
    raise exception 'invalid result';
  end if;
  if t.mode = 'text' then
    select coalesce(t.text_word_count, c.word_count) into v_total from public.typing_text_catalog c where c.id = t.text_id and c.lang = t.lang;
    if not found then raise exception 'invalid text'; end if;
    if p_text_words is not null and p_text_words <> v_total then raise exception 'invalid text length'; end if;
    select p.version into v_version from public.typing_progress p where p.user_id = auth.uid() and p.text_id = t.text_id;
    if coalesce(v_version, 0) <> t.progress_version then raise exception 'stale typing test'; end if;
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
    v_place := (t.start_word + p_words) % v_total;
    insert into public.typing_progress (user_id, text_id, words, updated_at, version)
    values (auth.uid(), t.text_id, v_place, now(), 1)
    on conflict (user_id, text_id) do update set words = excluded.words, updated_at = now(), version = typing_progress.version + 1;
  end if;
  return query select v_wpm, v_acc, round(v_wpm * v_acc, 1);
end;
$$;
