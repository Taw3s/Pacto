-- E2E fixtures, applied once to a fresh local Supabase (never to production).
\set ON_ERROR_STOP on

-- The group the tests join with the invite code.
insert into public.groups (name, invite_code) values ('Pacto', 'PACTO2026') on conflict (invite_code) do nothing;

-- Test-only: new members get "tomorrow's weekday" as their day off instead of Sunday, so the
-- suite behaves the same on any day of the week (see e2e/dates.mjs). Choices made later in
-- Settings are untouched (they are never inserted with the join date).
create or replace function public.e2e_default_day_off()
returns trigger
language plpgsql
as $$
begin
  if new.weekday = 0 and not exists (select 1 from public.day_off_changes where user_id = new.user_id) then
    new.weekday := (extract(dow from public.sp_today())::int + 1) % 7;
  end if;
  return new;
end;
$$;

drop trigger if exists e2e_default_day_off on public.day_off_changes;
create trigger e2e_default_day_off
  before insert on public.day_off_changes
  for each row execute function public.e2e_default_day_off();

-- Test-only: the in-app typing test lasts 3 seconds instead of 60 (see e2e/lib.mjs typingTest).
update public.typing_config set seconds = 3;
