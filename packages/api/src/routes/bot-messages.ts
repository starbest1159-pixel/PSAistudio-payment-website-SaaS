import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { BotAdapter, THAI_BIC_CODES } from '@psaipay/core';

export const botMessagesRouter = Router();
botMessagesRouter.use(requireAuth);

const botAdapter = new BotAdapter();

const pain001Schema = z.object({
  debtorAccount: z.string().min(1, 'Debtor account required'),
  creditorAccount: z.string().min(1, 'Creditor account required'),
  amount: z.string().min(1, 'Amount required'),
  currency: z.string().length(3).default('THB'),
});

const pacs008Schema = z.object({
  debtorBic: z.string().min(8, 'Debtor BIC required'),
  creditorBic: z.string().min(8, 'Creditor BIC required'),
  debtorAccount: z.string().min(1, 'Debtor account required'),
  creditorAccount: z.string().min(1, 'Creditor account required'),
  amount: z.string().min(1, 'Amount required'),
  currency: z.string().length(3).default('THB'),
});

const receiveSchema = z.object({
  payload: z.string().min(1, 'Payload required'),
});

botMessagesRouter.get('/', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const direction = req.query.direction as string | undefined;

  const data = await botAdapter.listMessages({ limit, offset, direction });
  res.json({ data, limit, offset });
});

botMessagesRouter.get('/bic-codes', (_req: AuthRequest, res) => {
  res.json(THAI_BIC_CODES);
});

botMessagesRouter.get('/:correlationId', async (req: AuthRequest, res) => {
  try {
    const message = await botAdapter.getMessageStatus(req.params.correlationId);
    res.json(message);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

botMessagesRouter.post('/pain001', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const parsed = pain001Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const message = await botAdapter.sendPain001(
      parsed.data.debtorAccount,
      parsed.data.creditorAccount,
      parsed.data.amount,
      parsed.data.currency,
    );
    res.status(201).json(message);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

botMessagesRouter.post('/pacs008', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const parsed = pacs008Schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const message = await botAdapter.sendPacs008(
      parsed.data.debtorBic,
      parsed.data.creditorBic,
      parsed.data.debtorAccount,
      parsed.data.creditorAccount,
      parsed.data.amount,
      parsed.data.currency,
    );
    res.status(201).json(message);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

botMessagesRouter.post('/receive', async (req: AuthRequest, res) => {
  const parsed = receiveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const message = await botAdapter.receiveMessage(parsed.data.payload);
    res.status(201).json(message);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
