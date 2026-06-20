import { Router } from 'express';
import { Server } from 'socket.io';
import { getDb, localDate, getSetting } from '../db/database';
import { Routine, RoutineCompletion, ServerToClientEvents, ClientToServerEvents } from '../types';
import { notifyRoutineComplete } from '../services/telegram';

export function routinesRouter(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const router = Router();

  router.get('/:type', (req, res) => {
    const db   = getDb();
    const type = req.params.type as 'morning' | 'evening';
    const date = localDate();

    const routines = db.prepare(
      'SELECT * FROM routines WHERE type = ? AND active = 1 ORDER BY sort_order'
    ).all(type) as Routine[];

    const completions = db.prepare(
      'SELECT routine_id FROM routine_completions WHERE date = ?'
    ).all(date) as { routine_id: number }[];

    const completedIds = completions.map(c => c.routine_id);
    res.json({ routines, completedIds });
  });

  router.post('/:id/complete', async (req, res) => {
    const db         = getDb();
    const routineId  = Number(req.params.id);
    const date       = localDate();

    try {
      db.prepare(
        'INSERT OR IGNORE INTO routine_completions (routine_id, date, completed_at) VALUES (?, ?, ?)'
      ).run(routineId, date, Math.floor(Date.now() / 1000));
    } catch {
      return res.status(409).json({ error: 'Already completed' });
    }

    const routine = db.prepare('SELECT * FROM routines WHERE id = ?').get(routineId) as Routine;
    const allForType = db.prepare(
      'SELECT id FROM routines WHERE type = ? AND active = 1'
    ).all(routine.type) as { id: number }[];

    const completedIds = (db.prepare(
      'SELECT routine_id FROM routine_completions WHERE date = ?'
    ).all(date) as { routine_id: number }[]).map(c => c.routine_id);

    io.to('display').emit('routineUpdate', { type: routine.type, completedIds });

    const allDone = allForType.every(r => completedIds.includes(r.id));
    let earnedMinutes = 0;
    if (allDone) {
      const settingKey = routine.type === 'morning' ? 'morning_routine_minutes' : 'evening_routine_minutes';
      earnedMinutes = Number(getSetting(settingKey) ?? 20);
      if (earnedMinutes > 0) {
        db.prepare(`
          INSERT INTO earned_time (date, minutes) VALUES (?, ?)
          ON CONFLICT(date) DO UPDATE SET minutes = minutes + excluded.minutes
        `).run(date, earnedMinutes);
        const { minutes } = db.prepare('SELECT minutes FROM earned_time WHERE date = ?').get(date) as { minutes: number };
        io.to('display').emit('balanceUpdate', { minutes, date });
      }
      await notifyRoutineComplete(routine.type, earnedMinutes);
      if (routine.type === 'morning') {
        db.prepare("UPDATE settings SET value='normal' WHERE key='mode'").run();
        io.to('display').emit('modeChange', 'normal');
      }
    }

    res.json({ ok: true, completedIds, allDone, earnedMinutes });
  });

  return router;
}
