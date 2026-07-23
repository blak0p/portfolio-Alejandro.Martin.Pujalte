#!/usr/bin/env bash
set -euo pipefail

CRON_SECRET="${1:-${CRON_SECRET:-}}"
if [[ -z "$CRON_SECRET" ]]; then
  echo "Uso: CRON_SECRET=xxx ./sync-community.sh"
  echo "  o:  ./sync-community.sh <secret>"
  exit 1
fi

URL="https://www.alejandro-m-p.com/api/cron/sync"

echo "▶ Sincronizando comunidad desde $URL ..."
curl -s -w "\n▶ HTTP %{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$URL" | jq . 2>/dev/null || echo "(raw output above)"
