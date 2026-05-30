import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { botJobs } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const botRouter = Router();
botRouter.use(requireAuth);

const jobSchema = z.object({
  botId: z.string().min(1, 'Bot ID required'),
  type: z.string().min(1, 'Job type required'),
  payload: z.any().optional(),
});

botRouter.get('/status', (_req: AuthRequest, res) => {
  const bots = [
    { id: 'bot-01', name: 'SCB Bot', bank: 'SCB', status: 'running', lastSeen: new Date(), jobsCompleted: 150 },
    { id: 'bot-02', name: 'KBANK Bot', bank: 'KBANK', status: 'idle', lastSeen: new Date(), jobsCompleted: 98 },
  ];
  res.json(bots);
});

botRouter.get('/jobs', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await db
    .select()
    .from(botJobs)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(botJobs.createdAt));

  res.json(data);
});

botRouter.post('/jobs', async (req: AuthRequest, res) => {
  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const [job] = await db
    .insert(botJobs)
    .values({ ...parsed.data, status: 'idle' })
    .returning();

  res.status(201).json(job);
});
