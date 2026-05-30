import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const merchantsRouter = Router();
merchantsRouter.use(requireAuth);

const store: any[] = [];

merchantsRouter.get('/', (_req, res) => res.json(store));
merchantsRouter.post('/', (req, res) => {
  const m = { id: crypto.randomUUID(), ...req.body, createdAt: new Date() };
  store.push(m);
  res.status(201).json(m);
});
merchantsRouter.get('/:id', (req, res) => {
  const m = store.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});
merchantsRouter.put('/:id', (req, res) => {
  const i = store.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  store[i] = { ...store[i], ...req.body, updatedAt: new Date() };
  res.json(store[i]);
});
merchantsRouter.delete('/:id', (req, res) => {
  const i = store.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  store.splice(i, 1);
  res.json({ message: 'Deleted' });
});
