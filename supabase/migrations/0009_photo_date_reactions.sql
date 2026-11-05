-- Pacto — when the proof photo was taken, and reactions on proofs. Run once, after 0008_extra_photos.sql.
--
-- * photo_taken_at: the oldest capture date the phone reports for the proof's photos (EXIF, or the
--   file's date). It is only a signal shown to the group ("foto de 3 dias atrás"): the phone can
--   lie, so nothing is blocked by it. A date in the future is dropped.
-- * Reactions: friends stamp a proof ("respeito", "monstro", "lenda"). Positive only: suspicion
--   belongs to the tribunal. One stamp of each kind per person and proof; never on your own proof.

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'checkins' and column_name = 'extra_photos') then
    raise exception 'Rode supabase/migrations/0008_extra_photos.sql antes deste arquivo.';
  end if;
end $$;

alter table public.checkins add column photo_taken_at timestamptz;
grant insert (photo_taken_at) on public.checkins to authenticated;

create or replace function public.checkins_photo_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.photo_taken_at is not null and new.photo_taken_at > now() + interval '5 minutes' then
    new.photo_taken_at := null;
  end if;
  return new;
end;
$$;
create trigger checkins_photo_date
  before insert on public.checkins
  for each row execute function public.checkins_photo_date();

create table public.checkin_reactions (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  kind text not null check (kind in ('respeito', 'monstro', 'lenda')),
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id, kind)
);
create index checkin_reactions_user_idx on public.checkin_reactions (user_id);

alter table public.checkin_reactions enable row level security;
revoke all on public.checkin_reactions from anon, authenticated;
grant select, delete on public.checkin_reactions to authenticated;
grant insert (checkin_id, kind) on public.checkin_reactions to authenticated;

create policy "reactions: read same group" on public.checkin_reactions
  for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and c.group_id = public.my_group_id()));
create policy "reactions: react to others in my group" on public.checkin_reactions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.checkins c where c.id = checkin_id and c.group_id = public.my_group_id() and c.user_id <> auth.uid())
  );
create policy "reactions: remove own" on public.checkin_reactions
  for delete to authenticated using (user_id = auth.uid());
