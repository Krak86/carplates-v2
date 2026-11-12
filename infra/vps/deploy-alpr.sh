#!/usr/bin/env bash
# ALPR deploy, run on the VPS by .github/workflows/deploy-alpr.yml:  bash deploy-alpr.sh <image-tag>
# Points ALPR_TAG at the new image, pulls it, recreates only the alpr container and waits for its health check.
set -euo pipefail

TAG="${1:?usage: deploy-alpr.sh <image-tag>}"
. /opt/carsua/compose/lib.sh

set_env ALPR_TAG "$TAG"
docker compose pull alpr </dev/null
docker compose up -d --no-deps alpr </dev/null
if wait_healthy alpr; then
  echo "alpr healthy"
  exit 0
fi
docker compose logs --tail 50 alpr >&2 </dev/null
echo "alpr did not become healthy" >&2
exit 1
