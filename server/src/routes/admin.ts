import { Router, Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import { getDb, getSetting, setSetting } from '../db/database';
import { initBot } from '../services/telegram';
import { Mission, Reward, Routine, ServerToClientEvents, ClientToServerEvents } from '../types';

declare module 'express-session' {
  interface SessionData { adminAuthed: boolean }
}

export function adminRouter(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const router = Router();

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (req.session.adminAuthed) return next();
    res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  router.post('/login', async (req, res) => {
    const { pin } = req.body as { pin: string };
    const hash    = getSetting('admin_pin_hash');
    const ok      = hash ? await bcrypt.compare(pin, hash) : pin === '1234';
    if (!ok) return res.status(401).json({ error: 'Wrong PIN' });
    req.session.adminAuthed = true;
    res.json({ ok: true });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get('/me', (req, res) => {
    res.json({ authed: !!req.session.adminAuthed });
  });

  // ── Missions ──────────────────────────────────────────────────────────────
  router.get('/missions', requireAuth, (_req, res) => {
    const missions = getDb().prepare('SELECT * FROM missions ORDER BY category, title').all() as Mission[];
    res.json(missions.map(m => ({ ...m, active: !!m.active, is_temporary: !!m.is_temporary })));
  });

  router.post('/missions', requireAuth, (req, res) => {
    const { title, description, category, icon, time_value, daily_limit } = req.body as Omit<Mission, 'id' | 'active' | 'is_temporary' | 'created_at' | 'expires_at'>;
    const result = getDb().prepare(`
      INSERT INTO missions (title, description, category, icon, time_value, daily_limit)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, description, category, icon, time_value, daily_limit ?? 1);
    const mission = getDb().prepare('SELECT * FROM missions WHERE id = ?').get(result.lastInsertRowid) as Mission;
    io.to('display').emit('missionAdded', { ...mission, active: !!mission.active, is_temporary: !!mission.is_temporary });
    res.json(mission);
  });

  router.put('/missions/:id', requireAuth, (req, res) => {
    const { title, description, category, icon, time_value, daily_limit, active } = req.body as Partial<Mission>;
    getDb().prepare(`
      UPDATE missions SET title=COALESCE(?,title), description=COALESCE(?,description),
        category=COALESCE(?,category), icon=COALESCE(?,icon),
        time_value=COALESCE(?,time_value), daily_limit=COALESCE(?,daily_limit),
        active=COALESCE(?,active)
      WHERE id=?
    `).run(title, description, category, icon, time_value, daily_limit, active === undefined ? undefined : (active ? 1 : 0), Number(req.params.id));
    res.json({ ok: true });
  });

  router.delete('/missions/:id', requireAuth, (req, res) => {
    getDb().prepare('UPDATE missions SET active = 0 WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Rewards ───────────────────────────────────────────────────────────────
  router.get('/rewards', requireAuth, (_req, res) => {
    res.json(getDb().prepare('SELECT * FROM rewards ORDER BY sort_order').all());
  });

  router.post('/rewards', requireAuth, (req, res) => {
    const { name, emoji, color, sort_order } = req.body as Partial<Reward>;
    const result = getDb().prepare('INSERT INTO rewards (name, emoji, color, sort_order) VALUES (?,?,?,?)').run(name, emoji ?? '🎮', color ?? '#22D3EE', sort_order ?? 99);
    res.json(getDb().prepare('SELECT * FROM rewards WHERE id = ?').get(result.lastInsertRowid));
  });

  router.put('/rewards/:id', requireAuth, (req, res) => {
    const { name, emoji, color, active, sort_order } = req.body as Partial<Reward>;
    getDb().prepare(`
      UPDATE rewards SET name=COALESCE(?,name), emoji=COALESCE(?,emoji),
        color=COALESCE(?,color), active=COALESCE(?,active), sort_order=COALESCE(?,sort_order)
      WHERE id=?
    `).run(name, emoji, color, active === undefined ? undefined : (active ? 1 : 0), sort_order, Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Routines ──────────────────────────────────────────────────────────────
  router.get('/routines', requireAuth, (_req, res) => {
    res.json(getDb().prepare('SELECT * FROM routines ORDER BY type, sort_order').all());
  });

  router.post('/routines', requireAuth, (req, res) => {
    const { type, title, sort_order } = req.body as Partial<Routine>;
    const result = getDb().prepare('INSERT INTO routines (type, title, sort_order) VALUES (?,?,?)').run(type, title, sort_order ?? 99);
    res.json(getDb().prepare('SELECT * FROM routines WHERE id = ?').get(result.lastInsertRowid));
  });

  router.put('/routines/:id', requireAuth, (req, res) => {
    const { title, active, sort_order } = req.body as Partial<Routine>;
    getDb().prepare(`
      UPDATE routines SET title=COALESCE(?,title), active=COALESCE(?,active), sort_order=COALESCE(?,sort_order)
      WHERE id=?
    `).run(title, active === undefined ? undefined : (active ? 1 : 0), sort_order, Number(req.params.id));
    res.json({ ok: true });
  });

  router.delete('/routines/:id', requireAuth, (req, res) => {
    getDb().prepare('UPDATE routines SET active = 0 WHERE id = ?').run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  router.get('/settings', requireAuth, (_req, res) => {
    const keys = ['soft_cap_minutes', 'morning_routine_start', 'evening_routine_start', 'display_name', 'approval_reminder_minutes', 'telegram_chat_id'];
    const rows = getDb().prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`)
      .all(...keys) as { key: string; value: string }[];
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    res.json(out);
  });

  router.put('/settings', requireAuth, (req, res) => {
    const allowed = ['soft_cap_minutes', 'morning_routine_start', 'evening_routine_start', 'display_name', 'approval_reminder_minutes'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) setSetting(key, String(req.body[key]));
    }
    if (req.body.admin_pin) {
      const hash = bcrypt.hashSync(String(req.body.admin_pin), 10);
      setSetting('admin_pin_hash', hash);
    }
    res.json({ ok: true });
  });

  router.put('/settings/telegram', requireAuth, (req, res) => {
    const { bot_token, chat_id } = req.body as { bot_token: string; chat_id: string };
    if (bot_token) {
      setSetting('telegram_bot_token', bot_token);
      try { initBot(bot_token); } catch (e) { console.error('[Admin] Bot reinit failed:', e); }
    }
    if (chat_id) setSetting('telegram_chat_id', chat_id);
    res.json({ ok: true });
  });

  // ── History ───────────────────────────────────────────────────────────────
  router.get('/history', requireAuth, (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    const rows  = getDb().prepare(`
      SELECT mc.*, m.title, m.time_value
      FROM mission_completions mc
      JOIN missions m ON m.id = mc.mission_id
      ORDER BY mc.completed_at DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  });

  return router;
}
