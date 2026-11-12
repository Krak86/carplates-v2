#!/usr/bin/env bash
# Ingest deploy, run on the VPS by .github/workflows/deploy-ingest.yml:  bash deploy-ingest.sh <image-tag>
# Points INGEST_TAG at the new image, pulls it, installs the crontab and loads the one-off seed tables that are still empty.
set -euo pipefail

TAG="${1:?usage: deploy-ingest.sh <image-tag>}"
. /opt/carsua/compose/lib.sh

set_env INGEST_TAG "$TAG"
install -d /opt/carsua/archive /opt/carsua/ingest-data
docker compose pull ingest </dev/null
crontab ingest.cron
docker image prune -f >/dev/null </dev/null
echo "ingest image $TAG ready; crontab installed"
# Load the one-off seed CSVs into tables that are still empty (skips filled ones); non-fatal: a table may not exist until the api deploy migrates.
bash ./run-ingest.sh seed-if-empty </dev/null || echo "warn: seed-if-empty failed (non-fatal)"
