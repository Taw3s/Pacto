-- Attachments are private, type-bound to their proof and never directly writable by clients.
\set ON_ERROR_STOP on

insert into groups(id,name,invite_code) values ('96000000-0000-0000-0000-000000000001','Attachments','FILES001');
insert into auth.users(id,email,raw_user_meta_data) values
  ('96000000-0000-0000-0000-000000000002','attachments@pacto.test','{"invite_code":"FILES001","display_name":"Files"}');
update groups set owner_id='96000000-0000-0000-0000-000000000002' where id='96000000-0000-0000-0000-000000000001';
insert into storage.objects(bucket_id,name) values
  ('media','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/project.jpg'),
  ('media','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/study.jpg');
create temp table attachment_checkins(id uuid);
grant select, insert on attachment_checkins to authenticated;
grant select, insert on attachment_checkins to service_role;

select set_config('request.jwt.claim.sub','96000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  begin
    insert into checkins(goal,photo_path,title)
    values ('project','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/project.jpg','Missing repo');
    raise exception 'FAIL: project without GitHub URL was accepted';
  exception when check_violation then null; end;
  begin
    insert into checkins(goal,photo_path,title,project_url)
    values ('project','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/project.jpg','Bad repo','https://github.com.evil.test/a/b');
    raise exception 'FAIL: non-GitHub URL was accepted';
  exception when check_violation then null; end;
end $$;
with inserted as (
  insert into checkins(goal,photo_path,title,project_url)
  values ('project','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/project.jpg','Valid repo','https://github.com/Taw3s/pactus')
  returning id
) insert into attachment_checkins select id from inserted;
with inserted as (
  insert into checkins(goal,photo_path,summary,minutes)
  values ('study','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/study.jpg','Estudei banco de dados relacionais e pratiquei consultas SQL.',60)
  returning id
) insert into attachment_checkins select id from inserted;
do $$ begin
  begin
    insert into checkin_attachments(checkin_id,group_id,user_id,kind,storage_path,display_name,size_bytes)
    values ((select id from attachment_checkins limit 1),'96000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000002','project_zip','x','project.zip',100);
    raise exception 'FAIL: clients can create attachment metadata';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values ('attachments','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/forbidden.zip');
    raise exception 'FAIL: clients can upload attachments directly';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

insert into storage.objects(bucket_id,name)
select 'attachments','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/' || id || '/project.zip'
from attachment_checkins limit 1;
insert into storage.objects(bucket_id,name)
select 'attachments','96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/' || id || '/study.pdf'
from attachment_checkins offset 1 limit 1;
set role service_role;
insert into checkin_attachments(checkin_id,group_id,user_id,kind,storage_path,display_name,size_bytes)
select id,'96000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000002','project_zip',
       '96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/' || id || '/project.zip','project.zip',100
from attachment_checkins limit 1;
insert into checkin_attachments(checkin_id,group_id,user_id,kind,storage_path,display_name,size_bytes)
select id,'96000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000002','study_pdf',
       '96000000-0000-0000-0000-000000000001/96000000-0000-0000-0000-000000000002/' || id || '/study.pdf','study.pdf',100
from attachment_checkins offset 1 limit 1;
reset role;

select set_config('request.jwt.claim.sub','96000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  assert (select count(*) from checkin_attachments) = 2, 'same-group members can read attachments';
  assert (select count(*) from storage.objects where bucket_id='attachments') = 2, 'same-group members can read private storage objects';
end $$;
reset role;
select 'ATTACHMENT TESTS PASSED' as result;
