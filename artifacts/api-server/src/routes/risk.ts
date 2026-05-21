import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const riskRouter = Router();
riskRouter.use(requireAuth);

const rules: any[] = [
  { id: '1', name: 'Large Transaction', type: 'amount', condition: 'amount > 100000', action: 'flag', severity: 2, isActive: true },
  { id: '2', name: 'Rapid Deposits', type: 'velocity', condition: 'count > 10 in 1h', action: 'block', severity: 3, isActive: true },
];

riskRouter.get('/rules', (_req, res) => res.json(rules));
riskRouter.post('/rules', (req, res) => {
  const r = { id: crypto.randomUUID(), ...req.body, createdAt: new Date() };
  rules.push(r);
  res.status(201).json(r);
});
riskRouter.put('/rules/:id', (req, res) => {
  const i = rules.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  rules[i] = { ...rules[i], ...req.body };
  res.json(rules[i]);
});
riskRouter.delete('/rules/:id', (req, res) => {
  const i = rules.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  rules.splice(i, 1);
  res.json({ message: 'Deleted' });
});
riskRouter.get('/analysis', (_req, res) => res.json({ score: 42, flags: [], lastUpdated: new Date() }));
