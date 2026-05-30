import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { LedgerService } from '@psaipay/core';
import { z } from 'zod';

export const ledgerRouter = Router();
ledgerRouter.use(requireAuth);

const ledgerService = new LedgerService();

const postSchema = z.object({
  debitAccountId: z.string().uuid(),
  creditAccountId: z.string().uuid(),
  amount: z.string().min(1),
  currency: z.string().length(3).default('THB'),
  reference: z.string().optional(),
  ledgerType: z.enum(['deposit', 'withdrawal', 'transfer', 'loan_disbursement', 'interest', 'fee', 'card_settlement']),
  description: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

ledgerRouter.get('/', async (req: AuthRequest, res) => {
  const accountId = req.query.accountId as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  if (accountId) {
    const statement = await ledgerService.getStatement(accountId, { from, to, limit, offset });
    return res.json(statement);
  }

  res.json({ data: [], total: 0, limit, offset, message: 'Provide accountId query parameter' });
});

ledgerRouter.post('/', async (req: AuthRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const result = await ledgerService.post(parsed.data);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message?.includes('Duplicate entry')) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(400).json({ error: err.message });
  }
});
