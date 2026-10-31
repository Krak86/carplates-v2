#!/usr/bin/env bash
# Off-box backups to an S3-compatible bucket (Cloudflare R2 free tier). Run on the VPS by cron (installed by bootstrap.sh):
#   backup.sh nightly   03:30 — `app` tables (users, sessions, settings…) + the registry tables that cannot be rebuilt
#   backup.sh full      after each monthly ingest (manual until ingest-cron exists) — whole DB, keeps the newest 2
#   backup.sh archive   mirrors /opt/carsua/archive (data.gov.ua source ZIPs) to the bucket
# Everything else in the DB is rebuildable from the source ZIPs or the committed seed CSVs (PLAN.md "Backup policy").
# Config: /opt/carsua/env/backup.env  →  RCLONE_CONFIG_R2_{TYPE,PROVIDER,NO_CHECK_BUCKET,ACCESS_KEY_ID,SECRET_ACCESS_KEY,ENDPOINT}, BACKUP_BUCKET,
#         optional HC_PING_BACKUP (healthchecks.io ping URL).
set -euo pipefail

MODE="${1:?usage: backup.sh nightly|full|archive}"
set -a
# shellcheck disable=SC1091
. /opt/carsua/env/backup.env
set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE=/opt/carsua/backups
PG="docker compose -f /opt/carsua/compose/docker-compose.prod.yml exec -T postgres"
ping() { [ -z "${HC_PING_BACKUP:-}" ] || curl -fsS -m 10 --retry 3 "$HC_PING_BACKUP$1" >/dev/null 2>&1 || true; }
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
    $PG sh -c 'pg_dump -Fc -Z 6 -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$f"
    rclone copyto "$f" "R2:$BACKUP_BUCKET/full/$(basename "$f")"
    # keep the 2 newest full dumps (lexical = chronological thanks to the UTC stamp)
    rclone lsf "R2:$BACKUP_BUCKET/full" | sort | head -n -2 | while read -r old; do rclone deletefile "R2:$BACKUP_BUCKET/full/$old"; done
    rm -f "$f"
    ;;
  archive)
    rclone copy /opt/carsua/archive "R2:$BACKUP_BUCKET/archive"
    ;;
  *)
    echo "unknown mode: $MODE" >&2
    exit 2
    ;;
esac

ping ""
echo "backup $MODE ok ($STAMP)"
