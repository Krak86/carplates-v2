#!/usr/bin/env bash
# Runs one scheduled ingest job in the ingest image:  run-ingest.sh news|social|wanted|plates
# Called by /etc/cron.d/carsua-ingest (infra/vps/ingest.cron). What each job runs, and its timeout, live in scripts/src/jobs.ts.
set -euo pipefail

JOB="${1:?usage: run-ingest.sh <job>}"
cd /opt/carsua/compose
export COMPOSE_FILE=docker-compose.prod.yml
install -d /opt/carsua/archive /opt/carsua/ingest-data

# --user: the bind mounts (archive/, ingest-data/) belong to the deploy user, not to the image's `node` user.
exec docker compose run --rm --no-deps -T --user "$(id -u):$(id -g)" ingest tsx src/run-job.ts "$JOB"
