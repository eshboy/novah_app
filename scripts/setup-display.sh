#!/usr/bin/env bash
set -e

echo "=== Setting up kiosk display ==="

# Install minimal X server
sudo apt-get install -y xserver-xorg xinit x11-xserver-utils

# Auto-login novah on TTY1
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf > /dev/null << 'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin novah --noclear %I $TERM
EOF

# Chromium kiosk via xinit
tee ~/.xinitrc > /dev/null << 'EOF'
#!/bin/bash
xset s off
xset -dpms
xset s noblank
exec /usr/bin/chromium-browser \
  --kiosk \
  --app=http://localhost:3000 \
  --no-sandbox \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-translate \
  --no-first-run \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI
EOF
chmod +x ~/.xinitrc

# Auto-start X on login to TTY1
if ! grep -q 'startx' ~/.bash_profile 2>/dev/null; then
  tee -a ~/.bash_profile > /dev/null << 'EOF'

if [[ -z "$DISPLAY" && "$(tty)" = "/dev/tty1" ]]; then
  exec startx
fi
EOF
fi

sudo systemctl daemon-reload

echo ""
echo "✅ Display setup complete. Run: sudo reboot"
