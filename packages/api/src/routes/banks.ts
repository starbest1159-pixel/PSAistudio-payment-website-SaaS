import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { bankConnections } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';

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

const connectSchema = z.object({
  merchantId: z.string().uuid().optional(),
  bankCode: z.string().min(1, 'Bank code required'),
  accountNumber: z.string().min(1, 'Account number required'),
  accountName: z.string().optional(),
});

banksRouter.get('/list', (_req: AuthRequest, res) => res.json(THAI_BANKS));

banksRouter.get('/connections', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await db
    .select()
    .from(bankConnections)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(bankConnections.createdAt));

  res.json(data);
});

banksRouter.post('/connections', async (req: AuthRequest, res) => {
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const [conn] = await db
    .insert(bankConnections)
    .values({ ...parsed.data, isActive: true })
    .returning();

  res.status(201).json(conn);
});

banksRouter.delete('/connections/:id', async (req: AuthRequest, res) => {
  const [deleted] = await db
    .delete(bankConnections)
    .where(eq(bankConnections.id, req.params.id))
    .returning();

  if (!deleted) return res.status(404).json({ error: 'Connection not found' });
  res.json({ message: 'Deleted' });
});
