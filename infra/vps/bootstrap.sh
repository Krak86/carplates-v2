#!/usr/bin/env bash
# One-time VPS setup. Run as root on a fresh Ubuntu 24.04:
#   scp infra/vps/bootstrap.sh root@<ip>:/root/ && ssh root@<ip> 'DEPLOY_PUBKEY="ssh-ed25519 AAAA… you" CI_PUBKEY="ssh-ed25519 AAAA… ci" bash /root/bootstrap.sh'
# DEPLOY_PUBKEY = your own key, CI_PUBKEY = the key GitHub Actions uses (generate a separate one: ssh-keygen -t ed25519 -f ci_key).
# Idempotent: safe to re-run. It locks root SSH login, so check `ssh deploy@<ip>` in a SECOND terminal before closing this session.
set -euo pipefail

: "${DEPLOY_PUBKEY:?set DEPLOY_PUBKEY}"
: "${CI_PUBKEY:?set CI_PUBKEY}"
[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends ca-certificates curl gnupg ufw fail2ban unattended-upgrades rsync rclone

# --- Docker Engine + compose plugin (official repo) ---
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# --- deploy user (docker group = effectively root on this box; that is the trade for push-to-deploy) ---
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n%s\n' "$DEPLOY_PUBKEY" "$CI_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

# --- SSH hardening ---
# 00- so it is read first: sshd keeps the first value, and a provider file (50-cloud-init.conf: PasswordAuthentication yes) would win over 99-.
rm -f /etc/ssh/sshd_config.d/99-carsua.conf
cat > /etc/ssh/sshd_config.d/00-carsua.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers deploy
MaxAuthTries 3
EOF
sshd -t && systemctl reload ssh

# --- firewall: SSH + web only. Docker publishes only Caddy's ports; DB/ALPR are on the internal network. ---
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
# Note: Docker-published ports bypass ufw. That is fine here (only Caddy publishes), but never add `ports:` to postgres/alpr.

systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades

# --- swap (the ingest index rebuild can spike memory) ---
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
sysctl -w vm.swappiness=10 >/dev/null
echo 'vm.swappiness=10' > /etc/sysctl.d/99-carsua.conf

# --- app tree (see PLAN.md "Deploy" / docs/deploy.md for what each folder is) ---
install -d -o deploy -g deploy /opt/carsua /opt/carsua/{compose,env,web,backups,archive,ingest-data}
install -d -o deploy -g deploy -m 700 /opt/carsua/env/certs
install -d -o deploy -g deploy /opt/carsua/compose/flags /opt/carsua/web/releases
# nightly off-box backup (script + credentials are delivered by the api deploy; until then the job just fails harmlessly)
cat > /etc/cron.d/carsua-backup <<'EOF'
30 3 * * * deploy bash /opt/carsua/compose/backup.sh nightly >> /opt/carsua/backups/backup.log 2>&1
EOF
chmod 644 /etc/cron.d/carsua-backup
# scheduled ingest jobs: the ingest deploy installs infra/vps/ingest.cron as the deploy user's crontab (no root needed)
# pgdata is owned by the postgres container's uid (set on first start); leave it root-owned.
install -d /opt/carsua/pgdata

echo
echo "Done. Next: in a NEW terminal run  ssh deploy@$(hostname -I | awk '{print $1}')  — only then close this session."
