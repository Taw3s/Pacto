-- Up to 4 photos per proof (0008). Runs after retake_test.sql.
\set ON_ERROR_STOP on

create or replace function pg_temp.act_as(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p::text, ''), false);
end $$;

insert into storage.objects (bucket_id, name)
select 'media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000005/' || n || '.jpg'
from unnest(array['r1', 'r2', 'r3', 'r4', 'r5', 't1', 't2']) n;
-- Someone else's photo, to try to borrow.
insert into storage.objects (bucket_id, name) values ('media', '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000004/alheia.jpg');

-- Eva (user 5) ---------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-000000000005');
set role authenticated;
do $$
declare base text := '00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000005/';
begin
  -- More than 4 photos in total.
  begin
    insert into public.checkins (goal, photo_path, pages, extra_photos)
    values ('reading', base || 'r1.jpg', 12, array[base || 'r2.jpg', base || 'r3.jpg', base || 'r4.jpg', base || 'r5.jpg']);
    raise exception 'FAIL: 5 photos accepted';
  exception when check_violation then null; end;
  -- An extra photo from another member's folder.
  begin
    insert into public.checkins (goal, photo_path, pages, extra_photos)
    values ('reading', base || 'r1.jpg', 12, array['00000000-0000-0000-0000-0000000000a1/00000000-0000-0000-0000-000000000004/alheia.jpg']);
    raise exception 'FAIL: borrowed photo accepted';
  exception when raise_exception then
    if sqlerrm not like '%invalid photo path%' then raise; end if;
  end;
  -- An extra photo that was never uploaded.
  begin
    insert into public.checkins (goal, photo_path, pages, extra_photos)
    values ('reading', base || 'r1.jpg', 12, array[base || 'nunca.jpg']);
    raise exception 'FAIL: missing extra photo accepted';
  exception when raise_exception then
    if sqlerrm not like '%photo not uploaded%' then raise; end if;
  end;
  -- The same photo twice.
  begin
    insert into public.checkins (goal, photo_path, pages, extra_photos)
    values ('reading', base || 'r1.jpg', 12, array[base || 'r1.jpg']);
    raise exception 'FAIL: repeated photo accepted';
  exception when raise_exception then
    if sqlerrm not like '%repeated photo%' then raise; end if;
  end;
  begin
    insert into public.checkins (goal, photo_path, pages, extra_photos)
    values ('reading', base || 'r1.jpg', 12, array[base || 'r2.jpg', base || 'r2.jpg']);
    raise exception 'FAIL: repeated extra photo accepted';
  exception when raise_exception then
    if sqlerrm not like '%repeated photo%' then raise; end if;
  end;
  -- 4 photos: fine. A proof with one photo keeps an empty list.
  insert into public.checkins (goal, photo_path, pages, extra_photos)
  values ('reading', base || 'r1.jpg', 12, array[base || 'r2.jpg', base || 'r3.jpg', base || 'r4.jpg']);
  insert into public.checkins (goal, photo_path) values ('typing', base || 't1.jpg');
  assert (select cardinality(extra_photos) from public.checkins where photo_path = base || 'r1.jpg') = 3, 'three extra photos stored';
  assert (select extra_photos from public.checkins where photo_path = base || 't1.jpg') = '{}', 'no extra photos by default';
end $$;
reset role;

select 'PHOTOS TESTS PASSED' as result;
