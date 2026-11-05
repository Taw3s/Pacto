-- Pacto — the question of the day on the study summary. Run once, after 0016_leave_remove_delete.sql.
--
-- * The study summary answers a question drawn per person and day (src/lib/study-prompts.ts):
--   checkins.study_prompt keeps its id, so the proof page shows what was asked.
-- * The AI judge also rates the answer (checkin_reviews.answer_check). It only informs the group:
--   the verdict, and so the AI accusation, still comes from the photo alone.
-- * Nullable on purpose: proofs sent before this file (and from an app still cached on a phone) have no question.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'payments' and column_name = 'received_name') then
    raise exception 'Rode supabase/migrations/0016_leave_remove_delete.sql antes deste arquivo.';
  end if;
end $$;

alter table public.checkins add column study_prompt text
  constraint study_prompt_format check (study_prompt ~ '^[a-z0-9-]{1,40}$');
grant insert (study_prompt) on public.checkins to authenticated;

-- Only the study proof itself has a question (not extra sessions nor other goals).
create or replace function public.checkins_study_prompt()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.goal::text <> 'study' or new.extra then
    new.study_prompt := null;
  end if;
  return new;
end;
$$;

create trigger checkins_study_prompt
  before insert on public.checkins
  for each row execute function public.checkins_study_prompt();

alter table public.checkin_reviews add column answer_check text
  constraint answer_check_values check (answer_check in ('specific', 'vague', 'off_topic'));
