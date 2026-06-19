import { Router } from 'express';
import { getSetting, getDb, localDate } from '../db/database';
import { AppMode } from '../types';

export const modeRouter = Router();

function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

export function currentMode(): AppMode {
  const now      = new Date();
  const nowMins  = now.getHours() * 60 + now.getMinutes();

  const morningStart = parseTime(getSetting('morning_routine_start') || '05:00');
  const eveningStart = parseTime(getSetting('evening_routine_start') || '18:30');

  const morningMins = morningStart.h * 60 + morningStart.m;
  const eveningMins = eveningStart.h * 60 + eveningStart.m;

  if (nowMins >= eveningMins) return 'evening';
  if (nowMins >= morningMins) {
    // Check if morning routine is complete for today
    const db           = getDb();
    const date         = localDate();
    const allMorning   = db.prepare("SELECT id FROM routines WHERE type='morning' AND active=1").all() as { id: number }[];
    const doneToday    = db.prepare("SELECT routine_id FROM routine_completions WHERE date=?").all(date) as { routine_id: number }[];
    const doneIds      = doneToday.map(r => r.routine_id);
    const morningDone  = allMorning.every(r => doneIds.includes(r.id));
    return morningDone ? 'normal' : 'morning';
  }
  return 'normal';
}

modeRouter.get('/', (_req, res) => {
  res.json({ mode: currentMode() });
});
