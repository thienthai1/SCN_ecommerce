#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "$EUID" -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/deploy-domain.sh" >&2
  exit 1
fi
[[ -f "$ROOT/frontend/dist/pwa/index.html" ]] || { echo 'Build frontend first.' >&2; exit 1; }
CONFIG=/etc/caddy/Caddyfile
SNIPPET="$ROOT/deploy/scn-emarket.Caddyfile"
if grep -Fq 'scn-emarket.kotrdev.com' "$CONFIG"; then
  echo 'Domain already configured; inspect existing configuration before deploying.' >&2
  exit 1
fi
BACKUP="${CONFIG}.backup-scn-$(date -u +%Y%m%dT%H%M%SZ)"
CANDIDATE=$(mktemp /etc/caddy/Caddyfile.scn.XXXXXX)
trap 'rm -f "$CANDIDATE"' EXIT
cat "$CONFIG" > "$CANDIDATE"
printf '\n' >> "$CANDIDATE"
cat "$SNIPPET" >> "$CANDIDATE"
caddy validate --config "$CANDIDATE" --adapter caddyfile
install -d -m 755 /var/www/scn-emarket
cp -R "$ROOT/frontend/dist/pwa/." /var/www/scn-emarket/
chmod -R a+rX /var/www/scn-emarket
cp -p "$CONFIG" "$BACKUP"
install -m 644 "$CANDIDATE" "$CONFIG"
if ! systemctl reload caddy; then
  cp -p "$BACKUP" "$CONFIG"
  systemctl reload caddy
  echo 'Reload failed; previous configuration restored.' >&2
  exit 1
fi
echo 'Configured https://scn-emarket.kotrdev.com (Caddy will provision HTTPS).'
