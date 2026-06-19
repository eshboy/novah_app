#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$APP_DIR/data"

echo "=== Novah App Installer ==="

# 1. Node 20
if ! node --version 2>/dev/null | grep -q 'v20'; then
  echo "Installing Node 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. Chromium
sudo apt-get install -y chromium-browser

# 3. avahi for mDNS
sudo apt-get install -y avahi-daemon
sudo systemctl enable avahi-daemon

# 4. Data directory
mkdir -p "$DATA_DIR"

# 5. Dependencies
cd "$APP_DIR"
npm install --workspaces

# 6. Build client
npm run build

# 7. tsx
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g tsx

# 8. Systemd services (substitute actual app path into service files)
sed "s|/home/novah/system/novah_app|$APP_DIR|g" "$SCRIPT_DIR/novah-server.service" | sudo tee /etc/systemd/system/novah-server.service > /dev/null
sudo cp "$SCRIPT_DIR/novah-kiosk.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable novah-server novah-kiosk
sudo systemctl start  novah-server

echo ""
echo "✅ Install complete."
echo "   Admin panel: http://$(hostname).local/admin  (or http://$(hostname -I | awk '{print $1}')/admin)"
echo "   Default PIN: 1234  — change this first!"
echo "   Next: set up Telegram, then: sudo reboot"
