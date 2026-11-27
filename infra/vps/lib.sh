#!/usr/bin/env bash
# Shared helpers for the VPS deploy scripts (deploy-api.sh, deploy-ingest.sh, deploy-alpr.sh). Not run directly:
#   . /opt/carsua/compose/lib.sh
# The deploy workflows rsync it into /opt/carsua/compose/ before the script that sources it runs. The scripts themselves are piped
# into `bash -s`, so they cannot source a sibling file by relative path; hence the absolute path.
# Sourcing it enters the compose directory and selects the prod compose file.

cd /opt/carsua/compose
# One deploy at a time on this VPS: the api/ingest/alpr workflows have separate concurrency groups, so they can overlap, and one
# deploy's image prune or layer extraction racing another's pull makes containerd fail with "lease does not exist: not found".
# The lock fd lives as long as the deploy script, so it is released on exit (also on failure). Waits up to 15 min.
exec 9>/opt/carsua/deploy.lock
flock -w 900 9 || { echo "another deploy still holds /opt/carsua/deploy.lock after 15 min" >&2; exit 1; }
export COMPOSE_FILE=docker-compose.prod.yml
touch .env
# docker-compose.prod.yml has no `latest` fallback and needs every tag to parse, so a tag that was never deployed gets a placeholder
# (an image tagged `unset` never exists: starting that service fails loudly instead of pulling whatever `latest` is).
for _k in API_TAG_BLUE API_TAG_GREEN ALPR_TAG INGEST_TAG; do grep -q "^${_k}=" .env || echo "${_k}=unset" >> .env; done
unset _k
# Redis runs as the deploy user so it can write the bind-mounted ../redisdata (created here, owned by deploy, never root).
mkdir -p ../redisdata
grep -q '^REDIS_UID=' .env || echo "REDIS_UID=$(id -u)" >> .env
# Same for Loki (../lokidata); Vector (root, to read Docker's log files) writes the daily archive into ../logs, which stays deploy-owned
# so backup.sh logs can delete old files. docker-compose.prod.yml needs LOKI_UID to parse, so every deploy script seeds it here.
mkdir -p ../lokidata ../logs
grep -q '^LOKI_UID=' .env || echo "LOKI_UID=$(id -u)" >> .env

# set_env KEY VALUE: replace (or add) one line in compose/.env, which holds the image tags and the colour tags.
set_env() { { grep -v "^$1=" .env || true; echo "$1=$2"; } > .env.tmp && mv .env.tmp .env; }

# prune_images [KEEP]: drop old carsua images, keeping the KEEP newest tags per repository (default 3) plus anything a container
# (even a stopped one, like the idle blue/green colour = the rollback target) still uses: `docker rmi` refuses in-use images.
# Plain `docker image prune -f` only removes untagged layers; every deploy adds a new sha tag, so those piled up (~130 GB).
# Scoped to ghcr.io/*/carsua-*: postgres and caddy are never touched. `docker image ls` lists newest first. Never fails a deploy.
prune_images() {
  docker image prune -f >/dev/null </dev/null || true
  docker image ls --filter 'reference=ghcr.io/*/carsua-*' --format '{{.Repository}}:{{.Tag}}' </dev/null \
    | awk -F: -v keep="${1:-3}" '++n[$1] > keep' \
    | xargs -r docker rmi >/dev/null 2>&1 || true
}

# pull_image SERVICE: docker compose pull with up to 3 attempts. containerd occasionally fails a layer commit ("lease does not exist",
# "rename … no such file"); clearing stale partial downloads and retrying normally succeeds. Returns 1 if every attempt fails.
pull_image() {
  local attempt
  for attempt in 1 2 3; do
    docker compose pull "$1" </dev/null && return 0
    [ "$attempt" = 3 ] && break
    echo "pull of $1 failed (attempt $attempt), retrying…" >&2
    docker image prune -f >/dev/null </dev/null || true
    sleep $((attempt * 10))
  done
  echo "image pull of $1 failed after 3 attempts" >&2
  return 1
}

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
