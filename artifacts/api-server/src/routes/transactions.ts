import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

const store: any[] = [];

transactionsRouter.get('/', (req, res) => {
  const { status, type, merchantId } = req.query;
  let data = store;
  if (status) data = data.filter(x => x.status === status);
  if (type) data = data.filter(x => x.type === type);
  if (merchantId) data = data.filter(x => x.merchantId === merchantId);
  res.json({ data, total: data.length });
});
transactionsRouter.get('/:id', (req, res) => {
  const t = store.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
