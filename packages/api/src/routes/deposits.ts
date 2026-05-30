import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { deposits } from '@psaipay/db';
import { eq, desc, sql } from 'drizzle-orm';
import { generatePromptPayQR } from '../lib/promptpay.js';

export const depositsRouter = Router();
depositsRouter.use(requireAuth);

const createSchema = z.object({
  merchantId: z.string().uuid().optional(),
  amount: z.string().min(1, 'Amount required'),
  promptpayId: z.string().optional(),
});

depositsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await db
    .select()
    .from(deposits)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(deposits.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(deposits);

  res.json({ data, total: count, limit, offset });
});

depositsRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { merchantId, amount, promptpayId } = parsed.data;
  const qrPayload = generatePromptPayQR(promptpayId || '0000000000000', parseFloat(amount));
  const qrImage = await QRCode.toDataURL(qrPayload);

  const [deposit] = await db
    .insert(deposits)
    .values({
      merchantId: merchantId || null,
      amount,
      promptpayRef: `PP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      qrPayload,
      status: 'pending',
    })
    .returning();

  res.status(201).json({ ...deposit, qrImage });
});

depositsRouter.get('/:id', async (req: AuthRequest, res) => {
  const [deposit] = await db
    .select()
    .from(deposits)
    .where(eq(deposits.id, req.params.id));

  if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
  res.json(deposit);
});

depositsRouter.patch('/:id/status', async (req: AuthRequest, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status required' });

  const [updated] = await db
    .update(deposits)
    .set({ status, updatedAt: new Date() })
    .where(eq(deposits.id, req.params.id))
    .returning();

  if (!updated) return res.status(404).json({ error: 'Deposit not found' });
  res.json(updated);
});
