#!/usr/bin/env bash
# One-off, run from YOUR machine (not on the VPS):  bash infra/vps/load-prozorro-dump.sh path/to/prozorro_auctions.sql.gz [ssh-host]
# Loads the local Prozorro.Sale dump (pg_dump --data-only --inserts --on-conflict-do-nothing -t registry.prozorro_auctions | gzip)
# into the VPS and runs the daily job once. Needs migration 0087 (API deploy) and the ingest deploy first. docs/deploy.md.
# Safe by design: refuses unless the table is empty, never TRUNCATEs, never touches registry.registrations, a repeat only skips rows.
set -euo pipefail

DUMP="${1:?usage: load-prozorro-dump.sh <prozorro_auctions.sql.gz> [ssh-host]}"
HOST="${2:-vps}"
[ -f "$DUMP" ] || { echo "no such file: $DUMP" >&2; exit 1; }

# psql inside the postgres container; extra psql args and stdin pass through (the remote script reads them from "$@" / stdin).
remote_psql() {
  ssh "$HOST" bash -s -- "$@" <<'REMOTE'
cd /opt/carsua/compose
export COMPOSE_FILE=docker-compose.prod.yml
exec docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" "$@"' sh "$@"
REMOTE
}
count() { remote_psql -tAc 'SELECT count(*) FROM registry.prozorro_auctions' </dev/null; }

before="$(count)"
echo "rows before: $before"
[ "$before" = 0 ] || { echo "table is not empty, refusing (the daily job fills it; load the dump only into an empty table)" >&2; exit 1; }

echo "loading $DUMP"
# The script text above is the ssh stdin, so the dump travels in a second step: stage it as a file on the VPS.
scp -q "$DUMP" "$HOST:prozorro_auctions.sql.gz"
ssh "$HOST" 'cd /opt/carsua/compose && export COMPOSE_FILE=docker-compose.prod.yml &&
  gzip -dc ~/prozorro_auctions.sql.gz | grep -v "^\\\(un\)\?restrict " |
  docker compose exec -T postgres sh -c '"'"'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -v ON_ERROR_STOP=1 -q'"'"''
echo "rows after load: $(count)"

ssh "$HOST" '/opt/carsua/compose/run-ingest.sh prozorro-auctions' </dev/null
echo "rows after daily run: $(count) (expect the dump's rows plus a few)"
ssh "$HOST" 'rm -f ~/prozorro_auctions.sql.gz'
