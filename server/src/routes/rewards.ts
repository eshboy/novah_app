import { Router } from 'express';
import { getDb } from '../db/database';
import { Reward } from '../types';

export const rewardsRouter = Router();

rewardsRouter.get('/', (_req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM rewards WHERE active = 1 ORDER BY sort_order')
    .all() as Reward[];
  res.json(rows.map(r => ({ ...r, active: !!r.active })));
});
