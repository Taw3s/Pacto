-- Attachment retention (0030). Runs after attachments_test.sql and the migration, applied twice by run.sh.
\set ON_ERROR_STOP on

do $$ begin
  assert exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checkin_attachments' and column_name = 'expired_at'), 'expired_at exists';
  assert (select count(*) from public.checkin_attachments where expired_at is not null) = 0, 'existing attachments start live';
end $$;

-- A member can read the stamp but never set or clear it.
select set_config('request.jwt.claim.sub','96000000-0000-0000-0000-000000000002',false);
set role authenticated;
do $$ begin
  assert (select count(*) from public.checkin_attachments) > 0, 'the owner reads the attachments of the group';
  assert (select count(*) from public.checkin_attachments where expired_at is null) > 0, 'and reads expired_at';
  begin
    update public.checkin_attachments set expired_at = now();
    raise exception 'FAIL: a member stamped an attachment as expired';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The server stamps it.
set role service_role;
update public.checkin_attachments set expired_at = now();
do $$ begin
  assert (select count(*) from public.checkin_attachments where expired_at is null) = 0, 'service role stamps expired_at';
end $$;
reset role;

select 'ATTACHMENT RETENTION TESTS PASSED';
