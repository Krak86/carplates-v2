#!/usr/bin/env bash
# Shared helpers for the VPS deploy scripts (deploy-api.sh, deploy-ingest.sh, deploy-alpr.sh). Not run directly:
#   . /opt/carsua/compose/lib.sh
# The deploy workflows rsync it into /opt/carsua/compose/ before the script that sources it runs. The scripts themselves are piped
# into `bash -s`, so they cannot source a sibling file by relative path; hence the absolute path.
# Sourcing it enters the compose directory and selects the prod compose file.

cd /opt/carsua/compose
export COMPOSE_FILE=docker-compose.prod.yml
touch .env

# set_env KEY VALUE: replace (or add) one line in compose/.env, which holds the image tags and the colour tags.
set_env() { { grep -v "^$1=" .env || true; echo "$1=$2"; } > .env.tmp && mv .env.tmp .env; }

# wait_healthy SERVICE: poll the container health check for up to ~90 s. Returns 1 on timeout and leaves the last status in
# HEALTH_STATUS. </dev/null on every docker call: the callers are piped into `bash -s`, and a command reading stdin would eat the script.
wait_healthy() {
  local cid
  cid="$(docker compose ps -q "$1" </dev/null)"
  HEALTH_STATUS=none
  for _ in $(seq 1 45); do
    HEALTH_STATUS="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null </dev/null || echo none)"
    [ "$HEALTH_STATUS" = healthy ] && return 0
    sleep 2
  done
  return 1
}
