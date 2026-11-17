#!/usr/bin/env bash
# Origin lockdown (docs/origin-hardening-plan.md H3): only Cloudflare ranges may reach Caddy on 80/443 (tcp) and 443/udp.
# Run as root on the VPS: `bash cf-firewall.sh apply` (idempotent, also the daily refresh), `status`, or `remove` (escape hatch).
# SSH (22) is untouched. Why not ufw: Docker-published ports are DNAT-ed and hit FORWARD, never ufw's INPUT rules, so the rules live in
# the DOCKER-USER chain (IPv4). IPv6 goes through docker-proxy (INPUT) unless Docker's ip6tables is on, so it is filtered in INPUT and,
# when the chain exists, DOCKER-USER too. Ranges: https://www.cloudflare.com/ips-v4 and ips-v6 (same data as `trusted_proxies` in the Caddyfile).
set -euo pipefail

cmd="${1:-apply}"
[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

CHAIN=CF-ORIGIN
SET4=cf4
SET6=cf6
PORTS_TCP=80,443
EXT_IF="$(ip -4 route show default | awk '{print $5; exit}')"
[ -n "$EXT_IF" ] || { echo "no default route interface" >&2; exit 1; }

# $1 = iptables|ip6tables, $2 = set name, $3 = chain to hook into, $4 = "forward" (match on the ORIGINAL dst port, DNAT already done) or "input"
build_chain() {
  local ipt="$1" set="$2" hook="$3" mode="$4" ch="$CHAIN"
  [ "$mode" = input ] && ch="${CHAIN}-IN"
  "$ipt" -N "$ch" 2>/dev/null || "$ipt" -F "$ch"
  "$ipt" -A "$ch" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
  "$ipt" -A "$ch" -m set --match-set "$set" src -j RETURN
  if [ "$mode" = forward ]; then
    "$ipt" -A "$ch" -p tcp -m conntrack --ctorigdstport 80 -j DROP
    "$ipt" -A "$ch" -p tcp -m conntrack --ctorigdstport 443 -j DROP
    "$ipt" -A "$ch" -p udp -m conntrack --ctorigdstport 443 -j DROP
  else
    "$ipt" -A "$ch" -p tcp -m multiport --dports "$PORTS_TCP" -j DROP
    "$ipt" -A "$ch" -p udp --dport 443 -j DROP
  fi
  "$ipt" -A "$ch" -j RETURN
  # hook once, only for traffic arriving on the public interface (container-to-container and loopback stay untouched)
  "$ipt" -C "$hook" -i "$EXT_IF" -j "$ch" 2>/dev/null || "$ipt" -I "$hook" 1 -i "$EXT_IF" -j "$ch"
}

fetch_ranges() { # $1 = v4|v6 -> stdout, validated CIDR lines; non-zero if the download looks wrong
  local out
  out="$(curl -fsS --max-time 20 "https://www.cloudflare.com/ips-$1")" || return 1
  out="$(printf '%s\n' "$out" | tr -d '\r' | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' || true)"
  [ "$(printf '%s\n' "$out" | grep -c .)" -ge 5 ] || return 1 # Cloudflare publishes ~15 v4 / ~7 v6; fewer means a bad response
  printf '%s\n' "$out"
}

load_set() { # $1 = set name, $2 = inet|inet6, $3 = v4|v6; atomic swap, keeps the old set if the fetch fails
  local set="$1" fam="$2" ver="$3" ranges
  if ! ranges="$(fetch_ranges "$ver")"; then
    echo "WARN: could not fetch Cloudflare $ver ranges, keeping the current set" >&2
    ipset list -n | grep -qx "$set" || { echo "no existing $set set and fetch failed: refusing to enforce" >&2; return 1; }
    return 0
  fi
  ipset create "$set" "hash:net" family "$fam" -exist
  ipset create "${set}_new" "hash:net" family "$fam" -exist
  ipset flush "${set}_new"
  while read -r cidr; do ipset add "${set}_new" "$cidr" -exist; done <<<"$ranges"
  ipset swap "${set}_new" "$set"
  ipset destroy "${set}_new"
}

remove_all() {
  for ipt in iptables ip6tables; do
    for hook in DOCKER-USER INPUT; do
      for ch in "$CHAIN" "${CHAIN}-IN"; do
        while "$ipt" -D "$hook" -i "$EXT_IF" -j "$ch" 2>/dev/null; do :; done
      done
    done
    for ch in "$CHAIN" "${CHAIN}-IN"; do "$ipt" -F "$ch" 2>/dev/null && "$ipt" -X "$ch" 2>/dev/null || true; done
  done
  for s in "$SET4" "$SET6"; do ipset destroy "$s" 2>/dev/null || true; done
}

case "$cmd" in
  apply)
    command -v ipset >/dev/null || { echo "apt-get install -y ipset first" >&2; exit 1; }
    iptables -L DOCKER-USER -n >/dev/null 2>&1 || { echo "DOCKER-USER chain missing: start docker first" >&2; exit 1; }
    load_set "$SET4" inet v4
    load_set "$SET6" inet6 v6
    build_chain iptables "$SET4" DOCKER-USER forward
    build_chain ip6tables "$SET6" INPUT input
    ip6tables -L DOCKER-USER -n >/dev/null 2>&1 && build_chain ip6tables "$SET6" DOCKER-USER forward
    echo "ok: 80/443 tcp + 443/udp on $EXT_IF now accept Cloudflare ranges only ($(ipset save "$SET4" | grep -c '^add') v4, $(ipset save "$SET6" | grep -c '^add') v6)"
    ;;
  status)
    iptables -S DOCKER-USER; iptables -S "$CHAIN" 2>/dev/null || echo "$CHAIN (v4): not installed"
    ip6tables -S "${CHAIN}-IN" 2>/dev/null || echo "${CHAIN}-IN (v6): not installed"
    ipset list -n
    ;;
  remove) remove_all; echo "removed: the origin accepts any source again" ;;
  *) echo "usage: $0 apply|status|remove" >&2; exit 2 ;;
esac
