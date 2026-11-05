#!/usr/bin/env bash
# Builds the demo group and takes the video's screenshots (see tools/video/README.md).
# Needs a FRESH local Supabase and the app running with GEMINI_API_URL=http://127.0.0.1:54400.
set -euo pipefail
cd "$(dirname "$0")"
export PGHOST="${PGHOST:-127.0.0.1}" PGPORT="${PGPORT:-54322}" PGUSER="${PGUSER:-postgres}" PGPASSWORD="${PGPASSWORD:-postgres}" PGDATABASE="${PGDATABASE:-postgres}"
psql -q -f setup.sql
node gemini_mock.mjs > gemini_mock.log 2>&1 &
trap 'kill $! 2>/dev/null' EXIT
sleep 1
node capture.mjs
