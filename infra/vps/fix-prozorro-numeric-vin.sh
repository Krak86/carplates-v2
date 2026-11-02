#!/usr/bin/env bash
# One-off, run from YOUR machine (not on the VPS):  bash infra/vps/fix-prozorro-numeric-vin.sh [--apply] [ssh-host]
# Cleans the Prozorro.Sale rows whose "VIN" is a 17-digit run (a vessel / asset registry number, e.g. 42022010000000065, an ARMA ship):
# findVin (scripts/src/prozorro-parse.ts) now rejects those, but rows ingested before that fix keep them. Deploy the ingest image first,
# or the next daily run can read the number again.
# Without --apply it only counts and lists (dry run). With --apply, in ONE transaction: a row that also has a plate keeps it and loses
# the VIN; a row with no plate is deleted (the parser would not store it today). Touches only registry.prozorro_auctions, never TRUNCATEs.
set -euo pipefail

APPLY=0
if [ "${1:-}" = "--apply" ]; then APPLY=1; shift; fi
HOST="${1:-vps}"

# psql inside the postgres container; extra psql args and stdin pass through (see load-prozorro-dump.sh).
remote_psql() {
  ssh "$HOST" "bash -s -- $(printf '%q ' "$@")" <<'REMOTE'
cd /opt/carsua/compose
export COMPOSE_FILE=docker-compose.prod.yml
exec docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB" "$@"' sh "$@"
REMOTE
}

WHERE="vin ~ '^[0-9]{17}\$'"

echo "rows with a 17-digit VIN, split by whether they have a plate:"
remote_psql -c "SELECT (plate IS NOT NULL) AS has_plate, count(*) FROM registry.prozorro_auctions WHERE $WHERE GROUP BY 1 ORDER BY 1" </dev/null
echo "sample:"
remote_psql -c "SELECT auction_id, plate, vin, make, model, status FROM registry.prozorro_auctions WHERE $WHERE ORDER BY source_modified_at DESC LIMIT 15" </dev/null

if [ "$APPLY" -ne 1 ]; then
  echo "dry run, nothing changed. Re-run with --apply."
  exit 0
fi

echo "applying"
remote_psql -v ON_ERROR_STOP=1 -c "
BEGIN;
UPDATE registry.prozorro_auctions SET vin = NULL WHERE $WHERE AND plate IS NOT NULL;
DELETE FROM registry.prozorro_auctions WHERE $WHERE AND plate IS NULL;
COMMIT;" </dev/null
echo "left with a 17-digit VIN: $(remote_psql -tAc "SELECT count(*) FROM registry.prozorro_auctions WHERE $WHERE" </dev/null) (expect 0)"
