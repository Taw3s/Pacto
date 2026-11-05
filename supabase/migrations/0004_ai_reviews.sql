-- Pacto — AI review of check-in photos (Gemini). Run once, after 0003_ranking_projects.sql.
--
-- The AI only points things out: it never annuls a check-in or creates debt.
-- Reviews are written by the server with the service_role key, so no member can forge one.

create table public.checkin_reviews (
  checkin_id uuid primary key references public.checkins (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  verdict text not null check (verdict in ('match', 'mismatch', 'unclear')),
  seen text not null check (char_length(seen) <= 300),   -- what the AI saw, in Portuguese
  detected integer check (detected between 0 and 100000), -- timer minutes / page number / WPM seen in the photo
  model text not null check (char_length(model) <= 80),
  created_at timestamptz not null default now()
);
create index checkin_reviews_group_idx on public.checkin_reviews (group_id);

alter table public.checkin_reviews enable row level security;

revoke all on public.checkin_reviews from anon, authenticated;
grant select on public.checkin_reviews to authenticated;
grant select, insert on public.checkin_reviews to service_role;

create policy "reviews: read same group" on public.checkin_reviews
  for select to authenticated using (group_id = public.my_group_id());
