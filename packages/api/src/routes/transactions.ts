import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { transactions } from '@psaipay/db';
import { eq, desc, sql, and } from 'drizzle-orm';

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

transactionsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const { status, type, merchantId } = req.query;

  const conditions = [];
  if (status) conditions.push(eq(transactions.status, status as string));
  if (type) conditions.push(eq(transactions.type, type as string));
  if (merchantId) conditions.push(eq(transactions.merchantId, merchantId as string));

  const data = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(transactions.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({ data, total: count, limit, offset });
});

transactionsRouter.get('/:id', async (req: AuthRequest, res) => {
  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, req.params.id));

  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  res.json(tx);
});
