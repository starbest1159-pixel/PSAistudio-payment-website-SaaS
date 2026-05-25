import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const withdrawalsRouter = Router();
withdrawalsRouter.use(requireAuth);

const store: any[] = [];
const AUTO_APPROVE_LIMIT = parseFloat(process.env.AUTO_APPROVE_LIMIT || '5000');

withdrawalsRouter.get('/', (_req, res) => res.json(store));
withdrawalsRouter.post('/', (req, res) => {
  const w = { id: crypto.randomUUID(), ...req.body, status: 'pending', autoApproved: false, createdAt: new Date() };
  if (parseFloat(w.amount) <= AUTO_APPROVE_LIMIT) {
    w.status = 'approved';
    w.autoApproved = true;
    w.approvedAt = new Date();
  }
  store.push(w);
  res.status(201).json(w);
});
withdrawalsRouter.patch('/:id/approve', (req, res) => {
  const w = store.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  w.status = 'approved';
  w.approvedBy = 'admin';
  w.approvedAt = new Date();
  res.json(w);
});
withdrawalsRouter.patch('/:id/reject', (req, res) => {
  const w = store.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  w.status = 'rejected';
  w.note = req.body.note;
  res.json(w);
});
