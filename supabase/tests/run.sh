#!/usr/bin/env bash
# Runs the migration + tests against a throwaway local Postgres (needs Postgres 15+ binaries).
set -euo pipefail
cd "$(dirname "$0")"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}"
DATA="$(mktemp -d)"
PORT=54329
trap '"$PGBIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

"$PGBIN/initdb" -D "$DATA" -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA" -l "$DATA/log" start >/dev/null

PSQL=(psql -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f stub_supabase.sql
"${PSQL[@]}" -f ../migrations/0001_init.sql
"${PSQL[@]}" -f ../migrations/0002_security_fixes.sql
"${PSQL[@]}" -f ../migrations/0003_ranking_projects.sql
"${PSQL[@]}" -f ../migrations/0004_ai_reviews.sql
"${PSQL[@]}" -f rls_test.sql
"${PSQL[@]}" -f ../migrations/0005_ai_judge.sql
"${PSQL[@]}" -f ai_judge_test.sql
"${PSQL[@]}" -f ../migrations/0006_chests_push.sql
"${PSQL[@]}" -f chests_test.sql
"${PSQL[@]}" -f ../migrations/0007_retake_extra_study.sql
"${PSQL[@]}" -f retake_test.sql
"${PSQL[@]}" -f ../migrations/0008_extra_photos.sql
"${PSQL[@]}" -f photos_test.sql
"${PSQL[@]}" -f ../migrations/0009_photo_date_reactions.sql
"${PSQL[@]}" -f reactions_test.sql
"${PSQL[@]}" -f ../migrations/0010_typing_test.sql
"${PSQL[@]}" -f typing_test.sql
"${PSQL[@]}" -f ../migrations/0011_typing_texts.sql
"${PSQL[@]}" -f typing_texts_test.sql
"${PSQL[@]}" -f ../migrations/0012_typing_english.sql
"${PSQL[@]}" -f typing_english_test.sql
"${PSQL[@]}" -f ../migrations/0013_typing_five_minutes.sql
"${PSQL[@]}" -f typing_minutes_test.sql
"${PSQL[@]}" -f ../migrations/0014_ai_review_limits.sql
"${PSQL[@]}" -f ai_limits_test.sql
"${PSQL[@]}" -f ../migrations/0015_create_challenge_debt_menu.sql
"${PSQL[@]}" -f debt_menu_test.sql
"${PSQL[@]}" -f ../migrations/0016_leave_remove_delete.sql
"${PSQL[@]}" -f membership_test.sql
"${PSQL[@]}" -f ../migrations/0017_study_prompt.sql
"${PSQL[@]}" -f study_prompt_test.sql
"${PSQL[@]}" -f ../migrations/0018_membership_log.sql
"${PSQL[@]}" -f membership_log_test.sql
"${PSQL[@]}" -f ../migrations/0019_concurrent_attempt_limits.sql
"${PSQL[@]}" -f ../migrations/0020_debt_menu_rpc_privacy.sql
"${PSQL[@]}" -f ../migrations/0021_retry_media_cleanup.sql
"${PSQL[@]}" -f security_hardening_test.sql
"${PSQL[@]}" -f typing_integrity_legacy_fixture.sql
"${PSQL[@]}" -f ../migrations/0022_typing_progress_integrity.sql
"${PSQL[@]}" -f typing_integrity_test.sql
"${PSQL[@]}" -f ../migrations/0023_atomic_membership_and_proofs.sql
"${PSQL[@]}" -f transaction_safety_test.sql
"${PSQL[@]}" -f ../migrations/0024_bound_membership_cleanup.sql
"${PSQL[@]}" -f membership_binding_test.sql
"${PSQL[@]}" -f membership_log_patch_test.sql
"${PSQL[@]}" -f ../migrations/0025_join_day_never_owes.sql
"${PSQL[@]}" -f join_day_test.sql
"${PSQL[@]}" -f ../migrations/0026_audit_fixes.sql
"${PSQL[@]}" -f audit_fixes_test.sql
"${PSQL[@]}" -f collection_18_fixture.sql
"${PSQL[@]}" -f ../migrations/0027_collection_18.sql
"${PSQL[@]}" -f ../migrations/0027_collection_18.sql
"${PSQL[@]}" -f collection_18_test.sql
# Production already has this text field outside the checked-in migration history.
"${PSQL[@]}" -c "alter table public.checkins add column project_url text"
"${PSQL[@]}" -f ../migrations/0028_checkin_attachments.sql
# Reapplying must be safe if an earlier SQL Editor run stopped after a partial change.
"${PSQL[@]}" -f ../migrations/0028_checkin_attachments.sql
# Production state on 03/11/2026: the first version ran and project_requires_github_url was dropped by hand.
"${PSQL[@]}" -c "alter table public.checkins drop constraint project_requires_github_url"
"${PSQL[@]}" -f ../migrations/0028_checkin_attachments.sql
"${PSQL[@]}" -c 'do $$ begin assert exists (select 1 from pg_constraint where conname = '"'"'project_requires_github_url'"'"'), '"'"'0028 recreates the dropped constraint'"'"'; end $$'
"${PSQL[@]}" -f attachments_test.sql
"${PSQL[@]}" -f ../migrations/0029_welcome_seen.sql
"${PSQL[@]}" -f ../migrations/0029_welcome_seen.sql
"${PSQL[@]}" -f welcome_test.sql
"${PSQL[@]}" -f ../migrations/0030_attachment_retention.sql
"${PSQL[@]}" -f ../migrations/0030_attachment_retention.sql
"${PSQL[@]}" -f attachment_retention_test.sql
