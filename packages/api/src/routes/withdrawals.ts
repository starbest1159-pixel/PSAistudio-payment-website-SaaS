import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { withdrawals } from '@psaipay/db';
import { eq, desc, sql } from 'drizzle-orm';

export const withdrawalsRouter = Router();
withdrawalsRouter.use(requireAuth);

const createSchema = z.object({
  merchantId: z.string().uuid().optional(),
  amount: z.string().min(1, 'Amount required'),
  bankCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
});

const AUTO_APPROVE_LIMIT = parseFloat(process.env.AUTO_APPROVE_LIMIT || '5000');

withdrawalsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await db
    .select()
    .from(withdrawals)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(withdrawals.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(withdrawals);

  res.json({ data, total: count, limit, offset });
});

withdrawalsRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const autoApproved = parseFloat(parsed.data.amount) <= AUTO_APPROVE_LIMIT;
  const status = autoApproved ? 'approved' : 'pending';

  const [w] = await db
    .insert(withdrawals)
    .values({
      ...parsed.data,
      status,
      autoApproved,
      approvedBy: autoApproved ? 'system' : null,
      approvedAt: autoApproved ? new Date() : null,
    })
    .returning();

  res.status(201).json(w);
});

withdrawalsRouter.patch('/:id/approve', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const [w] = await db
    .update(withdrawals)
    .set({
      status: 'approved',
      approvedBy: req.user?.username || 'unknown',
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, req.params.id))
    .returning();

  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  res.json(w);
});

withdrawalsRouter.patch('/:id/reject', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const { note } = req.body;
  const [w] = await db
    .update(withdrawals)
    .set({
      status: 'rejected',
      note: note || 'Rejected by operator',
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, req.params.id))
    .returning();

  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  res.json(w);
});
