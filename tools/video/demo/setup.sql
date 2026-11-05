-- Demo group of the video, applied to a FRESH local Supabase (never to production). See tools/video/README.md.
\set ON_ERROR_STOP on

insert into public.groups (name, invite_code) values ('Pacto dos Amigos', 'DEMO2026') on conflict (invite_code) do nothing;

-- The typing test lasts 3 seconds instead of 60 (the proof card does not show the duration).
update public.typing_config set seconds = 3;

-- New members get tomorrow's weekday as day off, so no demo day falls on it (as in e2e/setup.sql).
create or replace function public.demo_default_day_off()
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
drop trigger if exists demo_default_day_off on public.day_off_changes; -- (a NOTICE on the first run is expected)
create trigger demo_default_day_off before insert on public.day_off_changes for each row execute function public.demo_default_day_off();
