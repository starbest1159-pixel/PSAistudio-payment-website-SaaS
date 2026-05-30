import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { merchants } from '@psaipay/db';
import { eq, desc, sql } from 'drizzle-orm';

export const merchantsRouter = Router();
merchantsRouter.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  code: z.string().min(1, 'Code required'),
  promptpayId: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  name: z.string().optional(),
  promptpayId: z.string().optional(),
  webhookUrl: z.string().optional(),
  isActive: z.boolean().optional(),
  autoApproveLimit: z.string().optional(),
});

merchantsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await db
    .select()
    .from(merchants)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(merchants.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(merchants);

  res.json({ data, total: count, limit, offset });
});

merchantsRouter.post('/', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const [merchant] = await db
    .insert(merchants)
    .values(parsed.data)
    .returning();

  res.status(201).json(merchant);
});

merchantsRouter.get('/:id', async (req: AuthRequest, res) => {
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, req.params.id));

  if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
  res.json(merchant);
});

merchantsRouter.put('/:id', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const [updated] = await db
    .update(merchants)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(merchants.id, req.params.id))
    .returning();

  if (!updated) return res.status(404).json({ error: 'Merchant not found' });
  res.json(updated);
});

merchantsRouter.delete('/:id', requireRole('admin'), async (req: AuthRequest, res) => {
  const [deleted] = await db
    .delete(merchants)
    .where(eq(merchants.id, req.params.id))
    .returning();

  if (!deleted) return res.status(404).json({ error: 'Merchant not found' });
  res.json({ message: 'Deleted' });
});
