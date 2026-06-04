import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const banksRouter = Router();
banksRouter.use(requireAuth);

const THAI_BANKS = [
  { code: 'BBL', name: 'Bangkok Bank', color: '#1E3A8A' },
  { code: 'KBANK', name: 'Kasikorn Bank', color: '#006633' },
  { code: 'KTB', name: 'Krungthai Bank', color: '#00AEEF' },
  { code: 'BAY', name: 'Bank of Ayudhya', color: '#FFD700' },
  { code: 'SCB', name: 'Siam Commercial Bank', color: '#4B0082' },
  { code: 'TMB', name: 'TMBThanachart Bank', color: '#003087' },
  { code: 'UOB', name: 'United Overseas Bank', color: '#003893' },
  { code: 'GSB', name: 'Government Savings Bank', color: '#FF69B4' },
];

const connections: any[] = [];

banksRouter.get('/list', (_req, res) => res.json(THAI_BANKS));
banksRouter.get('/connections', (_req, res) => res.json(connections));
banksRouter.post('/connections', (req, res) => {
  const c = { id: crypto.randomUUID(), ...req.body, isActive: true, createdAt: new Date() };
  connections.push(c);
  res.status(201).json(c);
});
banksRouter.delete('/connections/:id', (req, res) => {
  const i = connections.findIndex(x => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  connections.splice(i, 1);
  res.json({ message: 'Deleted' });
});
