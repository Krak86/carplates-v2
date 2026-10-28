#!/usr/bin/env bash
# Progress of the scheduled ingest jobs:  ingest-status.sh   (or:  watch -n 300 ingest-status.sh)
# Read-only. Shows the running ingest container, its last log lines, the run log and what Postgres is doing right now.
C="docker compose -f /opt/carsua/compose/docker-compose.prod.yml"
PSQL='psql -U $POSTGRES_USER $POSTGRES_DB'

echo "== $(date -u '+%F %T') UTC =="
cid="$(docker ps -q --filter name=carsua-ingest-run | head -n 1)"
echo "-- container"
if [ -n "$cid" ]; then
  docker ps --filter "id=$cid" --format '{{.Names}}  {{.Status}}'
  docker stats --no-stream --format 'cpu {{.CPUPerc}}  mem {{.MemUsage}}' "$cid"
  echo "-- last log lines"
  docker logs --tail 6 "$cid" 2>&1 | cut -c1-110
else
  echo "(no ingest container running)"
fi
[ -f /opt/carsua/ingest-data/backfill-pending ] && echo "-- backfill pending since $(cat /opt/carsua/ingest-data/backfill-pending)"
echo "-- job_runs"
$C exec -T postgres sh -c "$PSQL -c \"SELECT job, status, started_at, finished_at, left(error,60) AS error FROM registry.job_runs ORDER BY id DESC LIMIT 5\"" </dev/null
echo "-- db activity"
$C exec -T postgres sh -c "$PSQL -c \"SELECT state, wait_event_type AS wait, now()-query_start AS running_for, left(regexp_replace(query, '[[:space:]]+', ' ', 'g'), 90) AS query FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND state<>'idle' ORDER BY query_start\"" </dev/null
