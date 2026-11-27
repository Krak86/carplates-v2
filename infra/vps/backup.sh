#!/usr/bin/env bash
# Off-box backups to an S3-compatible bucket (Cloudflare R2 free tier). Run on the VPS by cron (installed by bootstrap.sh):
#   backup.sh nightly   03:30 — `app` tables (users, sessions, settings…) + the registry tables that cannot be rebuilt
#   backup.sh full      after each monthly ingest (manual until ingest-cron exists) — whole DB minus the `app` schema (account data lives only in the 14-day nightlies), keeps the newest 2
#   backup.sh archive   mirrors /opt/carsua/archive (data.gov.ua source ZIPs) to the bucket
#   backup.sh logs      03:50 — yesterday's and older Vector log archives (/opt/carsua/logs/*.ndjson.gz) to the separate Backblaze B2 bucket
# Everything else in the DB is rebuildable from the source ZIPs or the committed seed CSVs (PLAN.md "Backup policy").
# Config: /opt/carsua/env/backup.env  →  RCLONE_CONFIG_R2_{TYPE,PROVIDER,NO_CHECK_BUCKET,ACCESS_KEY_ID,SECRET_ACCESS_KEY,ENDPOINT}, BACKUP_BUCKET,
#         optional HC_PING_BACKUP (healthchecks.io ping URL).
# Mode `logs` uses its own file instead: /opt/carsua/env/logs-archive.env  →  RCLONE_CONFIG_B2_{TYPE,ACCOUNT,KEY,ENDPOINT…}, LOGS_BUCKET,
#         optional HC_PING_LOGS. The B2 key is write-only (writeFiles + listBuckets) and never lives in backup.env.
set -euo pipefail

MODE="${1:?usage: backup.sh nightly|full|archive|logs}"
if [ "$MODE" = logs ]; then
  ENV_FILE=/opt/carsua/env/logs-archive.env
  # Deploys work before B2 is set up: no credentials yet = skip, not fail.
  [ -r "$ENV_FILE" ] || { echo "warn: $ENV_FILE missing, skipping the logs archive" >&2; exit 0; }
else
  ENV_FILE=/opt/carsua/env/backup.env
fi
set -a
# shellcheck disable=SC1091
. "$ENV_FILE"
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE=/opt/carsua/backups
PG="docker compose -f /opt/carsua/compose/docker-compose.prod.yml exec -T postgres"
HC_URL="${HC_PING_BACKUP:-}"
[ "$MODE" != logs ] || HC_URL="${HC_PING_LOGS:-}"
ping() { [ -z "$HC_URL" ] || curl -fsS -m 10 --retry 3 "$HC_URL$1" >/dev/null 2>&1 || true; }
trap 'ping /fail' ERR
ping /start

# Tables that exist only in this database (feeds roll over / history is ours); kept in the nightly dump.
IRREPLACEABLE=(wanted_vehicles wanted_plates news_items social_posts owner_posts missed_lookups ingested_resources)

case "$MODE" in
  nightly)
    # Not --schema=app: pg_dump ignores -n/--schema once any -t is given, which would silently drop every app table.
    args=(-t "'app.*'")
    for t in "${IRREPLACEABLE[@]}"; do args+=(-t "registry.$t"); done
    f="$STAGE/nightly-$STAMP.dump"
    $PG sh -c 'pg_dump -Fc -Z 6 -U "$POSTGRES_USER" "$POSTGRES_DB" '"${args[*]}" > "$f"
    rclone copyto "$f" "R2:$BACKUP_BUCKET/nightly/$(basename "$f")"
    rclone delete "R2:$BACKUP_BUCKET/nightly" --min-age 14d
    rm -f "$f"
    ;;
  full)
    f="$STAGE/full-$STAMP.dump"
    $PG sh -c 'pg_dump -Fc -Z 6 --exclude-schema=app -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$f"
    rclone copyto "$f" "R2:$BACKUP_BUCKET/full/$(basename "$f")"
    # keep the 2 newest full dumps (lexical = chronological thanks to the UTC stamp)
    rclone lsf "R2:$BACKUP_BUCKET/full" | sort | head -n -2 | while read -r old; do rclone deletefile "R2:$BACKUP_BUCKET/full/$old"; done
    rm -f "$f"
    ;;
  archive)
    rclone copy /opt/carsua/archive "R2:$BACKUP_BUCKET/archive"
    ;;
  logs)
    : "${LOGS_BUCKET:?LOGS_BUCKET missing in logs-archive.env}"
    # Today's file is still being appended to: upload everything except it. --immutable = never overwrite or change a remote file;
    # the key cannot delete, and copy never deletes remotely. A failure stops here (set -e), so nothing local is removed unsent.
    rclone copy /opt/carsua/logs "B2:$LOGS_BUCKET" --immutable --include '*.ndjson.gz' --exclude "$(date -u +%F).ndjson.gz"
    find /opt/carsua/logs -maxdepth 1 -name '*.ndjson.gz' -mtime +3 -delete
    ;;
  *)
    echo "unknown mode: $MODE" >&2
    exit 2
    ;;
esac

ping ""
echo "backup $MODE ok ($STAMP)"
