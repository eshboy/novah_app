import { Router } from 'express';
import { Server } from 'socket.io';
import { getDb, localDate } from '../db/database';
import { Mission, MissionCompletion, ServerToClientEvents, ClientToServerEvents } from '../types';
import { sendApprovalRequest } from '../services/telegram';

export function missionsRouter(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const router = Router();

  // List available missions for today
  router.get('/', (_req, res) => {
    const db   = getDb();
    const date = localDate();

    const missions = db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM mission_completions mc
         WHERE mc.mission_id = m.id AND mc.date = ? AND mc.status IN ('active','pending','approved')) AS completions_today
      FROM missions m
      WHERE m.active = 1
      ORDER BY m.category, m.title
    `).all(date) as (Mission & { completions_today: number })[];

    res.json(missions.map(m => ({
      ...m,
      active:       !!m.active,
      is_temporary: !!m.is_temporary,
      available:    m.completions_today < m.daily_limit,
    })));
  });

  // Start a mission — creates an active completion record
  router.post('/:id/start', (req, res) => {
    const db   = getDb();
    const date = localDate();
    const id   = Number(req.params.id);

    const mission = db.prepare('SELECT * FROM missions WHERE id = ? AND active = 1').get(id) as Mission | undefined;
    if (!mission) return res.status(404).json({ error: 'Mission not found' });

    const completionsToday = (db.prepare(`
      SELECT COUNT(*) AS n FROM mission_completions
      WHERE mission_id = ? AND date = ? AND status IN ('active','pending','approved')
    `).get(id, date) as { n: number }).n;

    if (completionsToday >= mission.daily_limit) {
      return res.status(409).json({ error: 'Daily limit reached' });
    }

    const result = db.prepare(`
      INSERT INTO mission_completions (mission_id, started_at, status, date)
      VALUES (?, ?, 'active', ?)
    `).run(id, Math.floor(Date.now() / 1000), date);

    res.json({ completionId: result.lastInsertRowid, mission });
  });

  // Mark a mission done — sends Telegram approval request
  router.post('/completions/:completionId/done', async (req, res) => {
    const db           = getDb();
    const completionId = Number(req.params.completionId);

    const completion = db.prepare('SELECT * FROM mission_completions WHERE id = ?').get(completionId) as MissionCompletion | undefined;
    if (!completion || completion.status !== 'active') {
      return res.status(404).json({ error: 'Completion not found or already finished' });
    }

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(completion.mission_id) as Mission;
    const now     = Math.floor(Date.now() / 1000);
    const elapsed = now - completion.started_at;

    db.prepare(`
      UPDATE mission_completions
      SET completed_at = ?, status = 'pending', elapsed_seconds = ?
      WHERE id = ?
    `).run(now, elapsed, completionId);

    const messageId = await sendApprovalRequest(completionId, mission, elapsed);
    if (messageId) {
      db.prepare('UPDATE mission_completions SET telegram_message_id = ? WHERE id = ?')
        .run(String(messageId), completionId);
    }

    res.json({ ok: true, completionId });
  });

  // Handle approval from Telegram callback (called internally by telegram service)
  router.post('/completions/:completionId/approve', (req, res) => {
    const db           = getDb();
    const completionId = Number(req.params.completionId);
    const { parentName } = req.body as { parentName: string };

    const completion = db.prepare('SELECT * FROM mission_completions WHERE id = ?').get(completionId) as MissionCompletion | undefined;
    if (!completion || completion.status !== 'pending') {
      return res.status(409).json({ error: 'Already acted on' });
    }

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(completion.mission_id) as Mission;
    const date    = completion.date;

    db.prepare(`
      UPDATE mission_completions SET status = 'approved', parent_action = 'approved', parent_name = ? WHERE id = ?
    `).run(parentName, completionId);

    // Add time to earned balance
    db.prepare(`
      INSERT INTO earned_time (date, minutes) VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET minutes = minutes + excluded.minutes
    `).run(date, mission.time_value);

    const { minutes } = db.prepare('SELECT minutes FROM earned_time WHERE date = ?').get(date) as { minutes: number };

    io.to('display').emit('missionApproved', {
      completionId,
      missionTitle: mission.title,
      minutes:      mission.time_value,
      parentName,
    });
    io.to('display').emit('balanceUpdate', { minutes, date });

    res.json({ ok: true });
  });

  // Handle denial from Telegram callback
  router.post('/completions/:completionId/deny', (req, res) => {
    const db           = getDb();
    const completionId = Number(req.params.completionId);
    const { parentName, reason } = req.body as { parentName: string; reason?: string };

    const completion = db.prepare('SELECT * FROM mission_completions WHERE id = ?').get(completionId) as MissionCompletion | undefined;
    if (!completion || completion.status !== 'pending') {
      return res.status(409).json({ error: 'Already acted on' });
    }

    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(completion.mission_id) as Mission;

    db.prepare(`
      UPDATE mission_completions
      SET status = 'denied', parent_action = 'denied', parent_name = ?, deny_reason = ?
      WHERE id = ?
    `).run(parentName, reason ?? null, completionId);

    io.to('display').emit('missionDenied', {
      completionId,
      missionTitle: mission.title,
      reason,
    });

    res.json({ ok: true });
  });

  return router;
}
