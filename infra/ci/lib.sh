#!/usr/bin/env bash
# Helpers for the deploy workflows' "write env files" steps (run on the GitHub runner, after the ssh-setup action):
#   . infra/ci/lib.sh

# emit NAME...: print NAME=value for every variable that is set and non-empty, so an unset optional feature stays "not configured".
emit() { for n in "$@"; do v="${!n:-}"; [ -n "$v" ] && printf '%s=%s\n' "$n" "$v"; done; return 0; }

# push_env LOCAL_FILE REMOTE_PATH: write a file on the VPS, never group/world-readable, even briefly (umask 077, then an atomic rename).
push_env() { ssh vps "umask 077; cat > '$2.new' && mv '$2.new' '$2'" < "$1"; }
