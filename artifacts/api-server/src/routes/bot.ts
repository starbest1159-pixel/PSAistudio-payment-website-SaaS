import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const botRouter = Router();
botRouter.use(requireAuth);

const bots = [
  { id: 'bot-01', name: 'SCB Bot', bank: 'SCB', status: 'running', lastSeen: new Date(), jobsCompleted: 150 },
  { id: 'bot-02', name: 'KBANK Bot', bank: 'KBANK', status: 'idle', lastSeen: new Date(), jobsCompleted: 98 },
];
const jobs: any[] = [];

botRouter.get('/status', (_req, res) => res.json(bots));
botRouter.get('/jobs', (_req, res) => res.json(jobs));
botRouter.post('/jobs', (req, res) => {
  const j = { id: crypto.randomUUID(), ...req.body, status: 'queued', createdAt: new Date() };
  jobs.push(j);
  res.status(201).json(j);
});
