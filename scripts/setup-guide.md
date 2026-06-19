# Novah App — Setup Guide

## What you need before starting
- Raspberry Pi 4 (any RAM)
- microSD card (16GB+) with **Raspberry Pi OS Lite 64-bit** flashed
- 10-inch display connected via HDMI
- USB mouse plugged in
- Pi on your home WiFi
- Both parents have **Telegram** installed on their iPhones

---

## Step 1 — First boot (Pi OS setup)
1. Boot the Pi, complete the initial setup wizard (set username to `novah`, pick your WiFi).
2. Enable SSH if you want to manage it remotely: `sudo raspi-config` → Interface Options → SSH → Enable.
3. Note the Pi's IP address: `hostname -I`

---

## Step 2 — Create the Telegram bot (BotFather)

1. Open Telegram and search for **@BotFather**.
2. Send: `/newbot`
3. Follow the prompts — give it any name (e.g. "Novah Mission Control") and a username ending in `bot` (e.g. `novah_missions_bot`).
4. BotFather will give you a **bot token** that looks like: `7123456789:AAFxxxxxxxxxxxxxxxxxxxx`  
   **Save this — you'll need it in Step 4.**

---

## Step 3 — Create the family group chat

1. Create a **new Telegram group** (name it anything, e.g. "Mission Control").
2. Add **both parents** to the group.
3. Add your bot to the group (search for its username).
4. Make the bot an admin of the group (tap the group name → Edit → Administrators → Add admin → your bot).

### Get the group chat ID
1. Forward any message from the group to **@userinfobot** in Telegram.
2. It will reply with the group's chat ID — it starts with `-100` (e.g. `-1001234567890`).  
   **Save this.**

---

## Step 4 — Install the app on the Pi

Copy the `novah_app` folder to the Pi (via USB drive, `scp`, or git), then:

```bash
cd /path/to/novah_app
bash scripts/install.sh
```

The installer:
- Installs Node 20 and Chromium
- Builds the app
- Installs systemd services that auto-start on boot

---

## Step 5 — Configure via admin panel

On any phone connected to home WiFi, open Safari and go to:

```
http://novahs-arcade.local/admin
```

(or use the Pi's IP: `http://192.168.x.x/admin`)

1. **PIN:** Enter `1234` (the default). **Change it immediately** under Settings → New Admin PIN.
2. **Telegram:** Paste in:
   - Bot token (from Step 2)
   - Group chat ID (from Step 3, including the `-100` prefix)
3. **Settings:** Set the morning/evening routine times and soft daily cap.
4. **Routines:** Confirm the checklist items are right.
5. **Missions:** Review the seeded missions; edit or add as needed.

---

## Step 6 — Test the Telegram connection

1. In admin → Settings, save your Telegram credentials.
2. Have Novah complete a mission and tap Done.
3. Both parents should receive an Approve/Deny notification in the group chat.
4. Tap Approve — Novah's screen should update in real time.

---

## Step 7 — Final reboot

```bash
sudo reboot
```

On boot:
- `novah-server` starts the app server.
- `novah-kiosk` launches Chromium in full-screen kiosk mode pointing to `localhost:3000`.
- Novah sees Mission Control. No desktop, no browser chrome, no escape.

---

## Day-to-day parent usage

### Approve/deny from phone
When Novah completes a mission, both parents get a Telegram notification with **✅ Approve** and **❌ Deny** buttons. First tap wins. Tap Deny, then reply to the bot's message to add a note for Novah (optional).

### Add a one-off mission
Text in the family group chat:
- `"Sweep the kitchen floor 15"` → bot adds "Sweep the kitchen floor" worth 15 minutes immediately.
- `"Help set the table"` (no number) → bot asks you for the minutes, reply with just the number.

### Access admin from phone
While on home WiFi: `http://novahs-arcade.local/admin`

### Access admin on the Pi screen
Triple-click the **top-right corner** of the display rapidly → PIN pad appears.

---

## Adjusting the display resolution

If your panel is not 1024×600, open `client/index.html` and `client/src/components/StarField.tsx` and change the `W`/`H` constants and the `width`/`height` in the `<html>` style block to match your panel's native resolution. Then rebuild: `npm run build`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Screen stays black | Check `systemctl status novah-server` and `novah-kiosk` on the Pi |
| Telegram not receiving | Verify the bot is admin in the group; re-check the chat ID starts with `-100` |
| App shows blank page | Run `npm run build` in `novah_app/` and restart: `sudo systemctl restart novah-server` |
| Time not resetting at midnight | Check Pi clock: `date` — set timezone with `sudo raspi-config` → Localisation |
| Admin panel unreachable on phone | Make sure phone and Pi are on same WiFi; try the Pi's IP directly |
