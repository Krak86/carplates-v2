#!/usr/bin/env bash
# Blue/green api deploy, run on the VPS by .github/workflows/deploy-api.yml:  bash deploy-api.sh <image-tag>
# Starts the idle colour with the new image, applies migrations, waits for it to be healthy, then stops the old colour.
# On any failure the old colour keeps serving (migrations must be backward compatible — see docs/deploy.md).
set -euo pipefail

TAG="${1:?usage: deploy-api.sh <image-tag>}"
cd /opt/carsua/compose
export COMPOSE_FILE=docker-compose.prod.yml
touch .env

set_env() { { grep -v "^$1=" .env || true; echo "$1=$2"; } > .env.tmp && mv .env.tmp .env; }
is_running() { [ -n "$(docker compose ps --status running -q "$1")" ]; }

if is_running api-blue; then OLD=blue NEW=green; else OLD=green NEW=blue; fi
is_running "api-$OLD" || OLD=none
echo "deploy $TAG: active=$OLD -> new=$NEW"

set_env "API_TAG_${NEW^^}" "$TAG"
# containerd occasionally fails a layer commit ("rename … ingest … no such file"); a retry after clearing stale partial
# downloads normally succeeds. Still fails the deploy (old colour keeps serving) if every attempt fails.
for attempt in 1 2 3; do
  docker compose pull "api-$NEW" </dev/null && break
  [ "$attempt" = 3 ] && { echo "image pull failed after $attempt attempts" >&2; exit 1; }
  echo "pull failed (attempt $attempt), retrying…" >&2
  docker image prune -f >/dev/null </dev/null || true
  sleep $((attempt * 10))
done

# Stateful services first (no-ops when already up). `up -d` never recreates them unless their definition changed.
docker compose up -d postgres alpr caddy

# The workflow pipes this script into `bash -s`, so bash reads it from stdin: any command that also reads stdin eats the rest
# of the script and bash exits 0 early. Hence </dev/null on every docker call that could attach stdin.
echo "migrating…"
docker compose run --rm --no-deps -T "api-$NEW" node node_modules/@carplates/db/dist/migrate.js </dev/null

docker compose up -d --no-deps "api-$NEW"
cid="$(docker compose ps -q "api-$NEW")"
for _ in $(seq 1 45); do
  status="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo none)"
  [ "$status" = healthy ] && break
  sleep 2
done
if [ "$status" != healthy ]; then
  echo "new api-$NEW did not become healthy (status=$status); keeping $OLD" >&2
  docker compose logs --tail 80 "api-$NEW" >&2 || true
  docker compose stop "api-$NEW" || true
  exit 1
fi

# Caddy sees the new upstream as healthy within ~2 s; give it time before dropping the old one.
sleep 6
[ "$OLD" = none ] || docker compose stop "api-$OLD"

# Pick up Caddyfile / maintenance.html changes (the files were rsynced with --inplace so the bind mounts see them).
docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null </dev/null

docker image prune -f >/dev/null
echo "api-$NEW is live ($TAG)"
