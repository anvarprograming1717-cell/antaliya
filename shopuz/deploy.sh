#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ──────────────────────────────────────────
# FTP credentials from deploy.env
# ──────────────────────────────────────────
if [ -f "$SCRIPT_DIR/deploy.env" ]; then
  source "$SCRIPT_DIR/deploy.env"
else
  echo ""
  echo "❌  deploy.env topilmadi!"
  echo ""
  echo "   Quyidagi buyruqni bajaring:"
  echo "   cp shopuz/deploy.env.example shopuz/deploy.env"
  echo "   Keyin FTP_PASS ni to'ldiring"
  echo ""
  exit 1
fi

FTP_HOST="${FTP_HOST:-fresh-777.uz}"
FTP_USER="${FTP_USER:-freshuz_shop}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/home/freshuz/public_html/app}"

if [ -z "$FTP_PASS" ]; then
  echo "❌  deploy.env da FTP_PASS bo'sh!"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ShopUz  →  $FTP_HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ──────────────────────────────────────────
# 1. Build server
# ──────────────────────────────────────────
echo ""
echo "🔨  [1/3] Server build..."
cd "$SCRIPT_DIR/server"
node build.mjs 2>&1 | grep -E "✅|❌|ERROR" || true
cp dist/index.cjs dist/app.js
echo "    ✅  dist/app.js tayyor"

# ──────────────────────────────────────────
# 2. Build client
# ──────────────────────────────────────────
echo ""
echo "🔨  [2/3] Client build..."
cd "$SCRIPT_DIR/client"
pnpm run build --silent
echo "    ✅  client/dist/ tayyor"

# ──────────────────────────────────────────
# 3. FTP upload
# ──────────────────────────────────────────
echo ""
echo "📤  [3/3] FTP yuklanyapti..."
echo "    Host: $FTP_HOST"
echo "    User: $FTP_USER"
echo "    Dir:  $FTP_REMOTE_DIR"
echo ""

cd "$SCRIPT_DIR"

lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST" <<FTPSCRIPT
set ftp:ssl-allow no
set net:timeout 60
set net:max-retries 3
set net:reconnect-interval-base 5
set mirror:parallel-transfer-count 4
set xfer:clobber yes

# Server main file
put server/dist/app.js -o $FTP_REMOTE_DIR/dist/app.js

# Client files (sync, delete old files)
mirror --reverse --delete --parallel=4 \
  --exclude=.DS_Store \
  client/dist/ \
  $FTP_REMOTE_DIR/public/

bye
FTPSCRIPT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deploy muvaffaqiyatli!"
echo "  🌐  https://fresh-777.uz"
echo ""
echo "  ⚠️  Eslatma: cPanel → Node.js"
echo "     ilovasini restart qiling!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
