import cron from 'node-cron';
import { Server } from 'socket.io';
import { getDb, getSetting, localDate } from '../db/database';
import { sendApprovalReminder } from './telegram';
import { currentMode } from '../routes/mode';
import { MissionCompletion, ServerToClientEvents, ClientToServerEvents, AppMode } from '../types';

let lastMode: AppMode | null = null;

// Track which completions we've already reminded about so we don't re-fire
// without corrupting the original completed_at timestamp.
// Key: `${completionId}:${reminderRound}` where round = Math.floor(age / reminderInterval)
const remindedKeys = new Set<string>();

export function setupCrons(io: Server<ClientToServerEvents, ServerToClientEvents>) {

  // Just after midnight — notify display to refresh (balance is date-keyed, so no purge needed)
  cron.schedule('1 0 * * *', () => {
    console.log('[Cron] Midnight — notifying display to refresh balance');
    const date = localDate();
    io.to('display').emit('balanceUpdate', { minutes: 0, date });
    // Clear old reminder keys to keep memory bounded
    remindedKeys.clear();
  });

  // Every minute — mode detection + approval reminders
  cron.schedule('* * * * *', async () => {
    const mode = currentMode();
    if (mode !== lastMode) {
      lastMode = mode;
      io.to('display').emit('modeChange', mode);
    }
    await checkApprovalReminders();
  });

  // 23:59 daily — soft-expire temp missions older than 24 h
  cron.schedule('59 23 * * *', () => {
    const db  = getDb();
    const now = Math.floor(Date.now() / 1000);
    const changed = db.prepare(
      "UPDATE missions SET active = 0 WHERE is_temporary = 1 AND created_at < ? - 86400"
    ).run(now);
    if (changed.changes > 0) console.log(`[Cron] Expired ${changed.changes} temporary mission(s)`);
  });
}

async function checkApprovalReminders() {
  const db           = getDb();
  const reminderMins = Number(getSetting('approval_reminder_minutes') || '15');
  const nowSec       = Math.floor(Date.now() / 1000);
  const cutoffSec    = nowSec - reminderMins * 60;

  const pending = db.prepare(`
    SELECT * FROM mission_completions
    WHERE status = 'pending'
      AND completed_at IS NOT NULL
      AND completed_at < ?
      AND telegram_message_id IS NOT NULL
  `).all(cutoffSec) as MissionCompletion[];

  for (const c of pending) {
    // Compute which "round" of reminders this is — fire once per interval
    const ageSeconds = nowSec - (c.completed_at ?? 0);
    const round      = Math.floor(ageSeconds / (reminderMins * 60));
    const key        = `${c.id}:${round}`;
    if (remindedKeys.has(key)) continue;
    remindedKeys.add(key);
    await sendApprovalReminder(c.id);
  }
}
