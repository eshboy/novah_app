#!/usr/bin/env bash
# Run this on the Pi as the novah user (or root for system steps).
# Usage: bash install.sh
set -e

APP_DIR="/home/novah/system/novah_app"
DATA_DIR="$APP_DIR/data"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Novah App Installer ==="

# 1. Node 20 (via NodeSource if not present)
if ! node --version 2>/dev/null | grep -q 'v20'; then
  echo "Installing Node 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. Chromium
sudo apt-get install -y chromium-browser

# 3. avahi for novah.local mDNS
sudo apt-get install -y avahi-daemon
sudo systemctl enable avahi-daemon
sudo hostnamectl set-hostname novahs-arcade

# 4. App directory
mkdir -p "$APP_DIR" "$DATA_DIR"
cp -r "$REPO_DIR/." "$APP_DIR/"

# 5. Dependencies
cd "$APP_DIR"
npm install --workspaces

# 6. Build client
npm run build

# 7. npm-global tsx
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g tsx

# 8. Systemd services
sudo cp "$SCRIPT_DIR/novah-server.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/novah-kiosk.service"  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable novah-server novah-kiosk
sudo systemctl start  novah-server

echo ""
echo "✅ Install complete."
echo "   Admin panel: http://novahs-arcade.local/admin  (or http://<pi-ip>/admin)"
echo "   Default PIN: 1234  ← change this first!"
echo "   Next: set up Telegram (see setup-guide.md)"
echo "   Then reboot: sudo reboot"
