#!/bin/sh
set -eu

: "${HYDRADB_TOKEN:?HYDRADB_TOKEN is required}"

token_file="${TOKEN_FILE:-/tmp/hydradb-token}"
token_directory=$(dirname "$token_file")
umask 077
mkdir -p "$token_directory"
printf '%s' "$HYDRADB_TOKEN" > "$token_file"
unset HYDRADB_TOKEN
export TOKEN_FILE="$token_file"

if [ "$#" -eq 0 ]; then
  echo "HydraDB image did not provide a command." >&2
  exit 64
fi

exec "$@"
