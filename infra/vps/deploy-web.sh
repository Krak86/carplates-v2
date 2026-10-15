#!/usr/bin/env bash
# Frontend deploy, run on the VPS by .github/workflows/deploy-web.yml:  bash deploy-web.sh <release-id>
# The new build was rsynced to /opt/carsua/web/releases/<release-id>. This keeps the previous release's hashed assets (open tabs and
# the PWA still request old lazy chunks), then atomically repoints `current`. The api re-reads index.html by mtime, so no restart.
set -euo pipefail

REL="${1:?usage: deploy-web.sh <release-id>}"
cd /opt/carsua/web
[ -f "releases/$REL/index.html" ] || { echo "releases/$REL/index.html missing" >&2; exit 1; }

if [ -L current ]; then
  prev="$(readlink current)"
  if [ -d "$prev/assets" ] && [ "$prev" != "releases/$REL" ]; then
    mkdir -p "releases/$REL/assets"
    rsync -a --ignore-existing "$prev/assets/" "releases/$REL/assets/"
  fi
fi

ln -sfn "releases/$REL" current.tmp
mv -T current.tmp current

# keep the 5 newest releases (the live one is always among them)
ls -1dt releases/*/ | tail -n +6 | xargs -r rm -rf
echo "web live: $REL"
