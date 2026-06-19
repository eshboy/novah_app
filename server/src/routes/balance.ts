import { Router } from 'express';
import { getDb, getSetting, localDate } from '../db/database';

export const balanceRouter = Router();

balanceRouter.get('/', (_req, res) => {
  const db   = getDb();
  const date = localDate();
  const row  = db.prepare('SELECT minutes FROM earned_time WHERE date = ?').get(date) as { minutes: number } | undefined;
  const softCapMinutes = Number(getSetting('soft_cap_minutes') || '120');
  res.json({ date, minutes: row?.minutes ?? 0, softCapMinutes });
});
