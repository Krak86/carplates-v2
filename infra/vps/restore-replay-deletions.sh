#!/usr/bin/env bash
# Run after ANY restore that brings back `app.*` (docs/deploy.md "Restore from R2"): re-deletes the accounts that were purged after the
# dump was taken. The API writes one empty-ish object `deleted/<user uuid>` (no PII) per purged account to the carsua-shares bucket;
# this deletes those ids from app.users (ON DELETE CASCADE clears the rest) and prunes entries older than 14 days.
# Config (in /opt/carsua/env/backup.env, besides the usual vars): RCLONE_CONFIG_LEDGER_{TYPE,PROVIDER,NO_CHECK_BUCKET,ACCESS_KEY_ID,
#   SECRET_ACCESS_KEY,ENDPOINT} for a read/delete token on the shares bucket, optional LEDGER_BUCKET (default carsua-shares).
set -euo pipefail

set -a
# shellcheck disable=SC1091
. /opt/carsua/env/backup.env
set +a

BUCKET="${LEDGER_BUCKET:-carsua-shares}"
PG="docker compose -f /opt/carsua/compose/docker-compose.prod.yml exec -T postgres"
UUID_RE='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

ids=$(rclone lsf "LEDGER:$BUCKET/deleted/" | grep -E "$UUID_RE" || true)
if [ -z "$ids" ]; then
  echo "no deletion ledger entries"
else
  list=$(echo "$ids" | sed "s/.*/'&'/" | paste -sd, -)
  $PG sh -c "psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" \"\$POSTGRES_DB\" -c \"DELETE FROM app.users WHERE id IN ($list)\""
fi
rclone delete "LEDGER:$BUCKET/deleted" --min-age 14d
echo "replayed $(echo -n "$ids" | grep -c . || true) deletion(s)"
