import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const ledgerRouter = Router();
ledgerRouter.use(requireAuth);

const entries: any[] = [];

ledgerRouter.get('/', (_req, res) => res.json({ data: entries, total: entries.length }));
ledgerRouter.post('/', (req, res) => {
  const e = { id: crypto.randomUUID(), ...req.body, createdAt: new Date() };
  entries.push(e);
  res.status(201).json(e);
});
