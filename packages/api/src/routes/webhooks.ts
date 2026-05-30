import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { webhookLogs } from '@psaipay/db';
import { desc } from 'drizzle-orm';

export const webhooksRouter = Router();
webhooksRouter.use(requireAuth);

const testSchema = z.object({
  url: z.string().url('Valid URL required'),
  event: z.string().min(1, 'Event name required'),
  payload: z.any().optional(),
  secret: z.string().optional(),
});

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

webhooksRouter.get('/logs', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await db
    .select()
    .from(webhookLogs)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(webhookLogs.createdAt));

  res.json(data);
});

webhooksRouter.post('/test', async (req: AuthRequest, res) => {
  const parsed = testSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { url, event, payload, secret } = parsed.data;
  const body = JSON.stringify(payload || { event });
  const sig = signPayload(body, secret || process.env.WEBHOOK_SECRET || 'secret');

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PSAiPay-Signature': sig },
      body,
    });

    const [log] = await db
      .insert(webhookLogs)
      .values({
        event,
        url,
        payload: payload || { event },
        statusCode: r.status,
        success: r.ok,
      })
      .returning();

    res.json(log);
  } catch (err: any) {
    const [log] = await db
      .insert(webhookLogs)
      .values({
        event,
        url,
        payload: payload || { event },
        success: false,
      })
      .returning();

    res.status(500).json({ ...log, error: String(err) });
  }
});
