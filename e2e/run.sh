#!/usr/bin/env bash
# Runs every stage in order against a running app (APP_URL) and a FRESH local Supabase.
# Stages share state (users created in a, history seeded before d), so run the whole file.
set -uo pipefail
cd "$(dirname "$0")"

export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-54322}" PGUSER="${PGUSER:-postgres}" PGPASSWORD="${PGPASSWORD:-postgres}" PGDATABASE="${PGDATABASE:-postgres}"
psql -q -f setup.sql

# Fake Gemini (the app must point GEMINI_API_URL at it, see README.md).
if ! curl -s -o /dev/null "http://127.0.0.1:54400"; then
  node gemini_mock.mjs > gemini_mock.log 2>&1 &
  MOCK_PID=$!
  trap 'kill $MOCK_PID 2>/dev/null' EXIT
  sleep 1
fi
rm -f gemini_calls.jsonl gemini_models.log push_calls.jsonl
# Fake Web Push service (the app must run with PUSH_TEST_SERVICE=1, see README.md).
if ! curl -s -o /dev/null "http://127.0.0.1:54500"; then
  node push_mock.mjs > push_mock.log 2>&1 &
  PUSH_PID=$!
  trap 'kill ${MOCK_PID:-} ${PUSH_PID:-} 2>/dev/null' EXIT
  sleep 1
fi

status=0
run() {
  echo "== stage $1"
  node "e2e_$1.mjs" || status=1
}
for s in a b c; do run "$s"; done
psql -q -f seed.sql
for s in d f g e h i j k l m n o; do run "$s"; done

echo
if [ "$status" -eq 0 ]; then echo "E2E: ALL STAGES PASSED"; else echo "E2E: FAILURES (see above)"; fi
exit "$status"
