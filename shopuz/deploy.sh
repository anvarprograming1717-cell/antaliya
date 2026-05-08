#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Load FTP credentials
if [ -f "$SCRIPT_DIR/deploy.env" ]; then
  source "$SCRIPT_DIR/deploy.env"
else
  echo "❌ deploy.env topilmadi!"
  echo "   cp shopuz/deploy.env.example shopuz/deploy.env"
  echo "   Keyin FTP_PASS ni to'ldiring"
  exit 1
fi

if [ -z "$FTP_HOST" ] || [ -z "$FTP_USER" ] || [ -z "$FTP_PASS" ]; then
  echo "❌ deploy.env da FTP_HOST, FTP_USER, FTP_PASS to'ldirilmagan!"
  exit 1
fi

FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/home/freshuz/public_html/app}"

echo ""
echo "🔨 1/3  Server build qilinmoqda..."
cd "$SCRIPT_DIR/server"
node build.mjs
cp dist/index.cjs dist/app.js
echo "   ✅ Server tayyor: dist/app.js"

echo ""
echo "🔨 2/3  Client build qilinmoqda..."
cd "$SCRIPT_DIR/client"
pnpm run build
echo "   ✅ Client tayyor: dist/"

echo ""
echo "📤 3/3  FTP orqali yuklanyapti → $FTP_HOST$FTP_REMOTE_DIR"
cd "$SCRIPT_DIR"

lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
set ftp:ssl-allow no
set net:timeout 30
set net:max-retries 3
set mirror:parallel-transfer-count 5

# Server faylni yuklash
put server/dist/app.js -o $FTP_REMOTE_DIR/dist/app.js
echo "   → dist/app.js yuklandi"

# Client dist/ papkasini sinxronlashtirish
mirror --reverse --delete --verbose=0 \
  client/dist/ \
  $FTP_REMOTE_DIR/public/

echo "   → client/dist/ yuklandi"
bye
EOF

echo ""
echo "✅ Deploy muvaffaqiyatli yakunlandi!"
echo "   🌐 https://fresh-777.uz"
echo ""
echo "⚠️  Eslatma: cPanelda Node.js ilovasini restart qiling!"
