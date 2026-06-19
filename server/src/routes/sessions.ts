import { Router } from 'express';
import { Server } from 'socket.io';
import { getDb, getSetting, localDate } from '../db/database';
import { ServerToClientEvents, ClientToServerEvents } from '../types';

export function sessionsRouter(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const router = Router();

  // Start a reward session — deducts from earned balance
  router.post('/start', (req, res) => {
    const db   = getDb();
    const date = localDate();
    const { rewardId, minutes } = req.body as { rewardId: number; minutes: number };

    if (!rewardId || !minutes || minutes < 1) {
      return res.status(400).json({ error: 'rewardId and minutes required' });
    }

    const balance = (db.prepare('SELECT minutes FROM earned_time WHERE date = ?').get(date) as { minutes: number } | undefined)?.minutes ?? 0;
    if (balance < minutes) {
      return res.status(400).json({ error: 'Not enough earned time' });
    }

    const softCap = Number(getSetting('soft_cap_minutes') || '120');
    const usedToday = (db.prepare(`
      SELECT COALESCE(SUM(ROUND(duration_seconds/60.0)), 0) AS used
      FROM reward_sessions WHERE date = ? AND ended_at IS NOT NULL
    `).get(date) as { used: number }).used;

    const result = db.prepare(`
      INSERT INTO reward_sessions (reward_id, started_at, duration_seconds, date)
      VALUES (?, ?, ?, ?)
    `).run(rewardId, Math.floor(Date.now() / 1000), minutes * 60, date);

    // Deduct from balance
    db.prepare('UPDATE earned_time SET minutes = minutes - ? WHERE date = ?').run(minutes, date);
    const newBalance = balance - minutes;

    io.to('display').emit('balanceUpdate', { minutes: newBalance, date });

    res.json({
      sessionId: result.lastInsertRowid,
      durationSeconds: minutes * 60,
      nearSoftCap: usedToday + minutes >= softCap * 0.9,
      overSoftCap: usedToday + minutes >= softCap,
    });
  });

  // End a reward session early (or on timer expiry)
  router.post('/:id/end', (req, res) => {
    const db        = getDb();
    const sessionId = Number(req.params.id);
    const now       = Math.floor(Date.now() / 1000);

    const session = db.prepare('SELECT * FROM reward_sessions WHERE id = ?').get(sessionId) as { ended_at: number | null; started_at: number; duration_seconds: number } | undefined;
    if (!session || session.ended_at) return res.status(404).json({ error: 'Session not found or already ended' });

    const actualSeconds = Math.min(now - session.started_at, session.duration_seconds);
    const unusedSeconds = session.duration_seconds - actualSeconds;

    db.prepare('UPDATE reward_sessions SET ended_at = ? WHERE id = ?').run(now, sessionId);

    // Refund unused time to balance
    if (unusedSeconds > 60) {
      const date          = localDate();
      const refundMinutes = Math.floor(unusedSeconds / 60);
      db.prepare(`
        INSERT INTO earned_time (date, minutes) VALUES (?, ?)
        ON CONFLICT(date) DO UPDATE SET minutes = minutes + excluded.minutes
      `).run(date, refundMinutes);
      const { minutes } = db.prepare('SELECT minutes FROM earned_time WHERE date = ?').get(date) as { minutes: number };
      io.to('display').emit('balanceUpdate', { minutes, date });
    }

    res.json({ ok: true });
  });

  return router;
}
