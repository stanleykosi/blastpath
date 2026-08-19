#!/bin/sh
set -eu

attempt=1
max_attempts="${SEED_MAX_ATTEMPTS:-30}"
retry_seconds="${SEED_RETRY_SECONDS:-10}"

while [ "$attempt" -le "$max_attempts" ]; do
  echo "BlastPath seed attempt ${attempt} of ${max_attempts}."
  if npm run seed -- --fixtures ./fixtures; then
    echo "BlastPath seed completed."
    exit 0
  fi

  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "BlastPath seed did not complete before the retry limit." >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep "$retry_seconds"
done
