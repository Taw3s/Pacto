-- Collection expansion (Astra cosmetics brief, 30/10/2026): 8 -> 18 shelf objects, 6 per rarity.
-- Shelf objects only: no points, powers, debt discount or tribunal advantage. Openings are not touched.
--
-- Weights move from 20/10/5 to 30/15/5 (decision of the owner and the Astra, replacing the brief's "keep the old
-- weights"): the daily chest stays 60% common / 30% rare / 10% legendary and the weekly one 75% rare / 25% legendary,
-- but each object is rarer than before. Daily chance of each object: common 10% (was 20%), rare 5% (was 10%),
-- legendary 1.67% (was 5%). Weekly: rare 12.5% (was 25%), legendary 4.17% (was 12.5%).
--
-- Run AFTER merging the app change: the current app does not know the new ids and would leave a chest stuck on them.
-- Safe to run twice.
do $$ begin
  if to_regprocedure('public._new_invite_code()') is null
     or position('_new_invite_code' in pg_get_functiondef('public.remove_member(uuid)'::regprocedure)) = 0 then
    raise exception 'Apply 0026_audit_fixes.sql first';
  end if;
  -- The 8 original objects must still be there with their rarity: ids are stored in chest_openings.
  if (select count(*) from public.collectibles c
      join (values ('plant', 'comum'), ('mug', 'comum'), ('duck', 'comum'), ('cat', 'raro'), ('lamp', 'raro'), ('globe', 'raro'),
                   ('goldBook', 'lendario'), ('crown', 'lendario')) v(id, rarity) on v.id = c.id and v.rarity = c.rarity) <> 8 then
    raise exception 'collectibles: the 8 original objects are not as expected';
  end if;
end $$;

insert into public.collectibles (id, rarity, weight) values
  ('forgottenCoffee', 'comum', 30), ('survivorPencil', 'comum', 30), ('patchedHeadphones', 'comum', 30),
  ('crookedHourglass', 'raro', 15), ('suspiciousLoupe', 'raro', 15), ('witnessPigeon', 'raro', 15),
  ('judgeSlippers', 'lendario', 5), ('rubberGavel', 'lendario', 5), ('goldenJudgeBust', 'lendario', 5), ('magistrateDuck', 'lendario', 5)
on conflict (id) do nothing;

-- One weight per rarity, old and new alike.
update public.collectibles set weight = case rarity when 'comum' then 30 when 'raro' then 15 else 5 end;

do $$ begin
  if (select count(*) from public.collectibles) <> 18
     or exists (select 1 from public.collectibles group by rarity having count(*) <> 6) then
    raise exception 'collectibles: expected 6 objects per rarity';
  end if;
end $$;
