#!/usr/bin/env bash
# Runs one scheduled ingest job in the ingest image:  run-ingest.sh news|social|wanted|plates
# Called by the deploy user's crontab (infra/vps/ingest.cron). What each job runs, and its timeout, live in scripts/src/jobs.ts.
# After a `plates` run that loaded something new it also runs `backup.sh archive` + `full` (new source ZIPs + a fresh dump).
set -euo pipefail

JOB="${1:?usage: run-ingest.sh <job>}"
cd /opt/carsua/compose
export COMPOSE_FILE=docker-compose.prod.yml
install -d /opt/carsua/archive /opt/carsua/ingest-data

START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
# --user: the bind mounts (archive/, ingest-data/) belong to the deploy user, not to the image's `node` user.
rc=0
docker compose run --rm --no-deps -T --user "$(id -u):$(id -g)" ingest tsx src/run-job.ts "$JOB" || rc=$?

if [ "$JOB" = plates ] && [ "$rc" -eq 0 ]; then
  # A resource row newer than this run's start = CKAN had something new (the `file:` snapshot row is rewritten on every load).
  loaded="$(docker compose exec -T postgres sh -c "psql -U \$POSTGRES_USER \$POSTGRES_DB -tAc \"SELECT count(*) FROM registry.ingested_resources WHERE ingested_at >= '$START' AND ckan_resource_id NOT LIKE 'file:%'\"" </dev/null)"
  if [ "${loaded:-0}" -gt 0 ]; then
    echo "plates: $loaded resource(s) loaded, backing up"
    bash /opt/carsua/compose/backup.sh archive
    bash /opt/carsua/compose/backup.sh full
  fi
fi
exit "$rc"
