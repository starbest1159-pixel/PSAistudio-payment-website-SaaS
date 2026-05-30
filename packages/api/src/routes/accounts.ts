import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { AccountService } from '@psaipay/core';

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

const accountService = new AccountService();

const openSchema = z.object({
  type: z.enum(['savings', 'current', 'fx']),
  currency: z.string().length(3).default('THB'),
  customerId: z.string().optional(),
});

accountsRouter.get('/', async (req: AuthRequest, res) => {
  const type = req.query.type as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await accountService.list({ type, limit, offset });
  res.json({ data, limit, offset });
});

accountsRouter.post('/', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const parsed = openSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const account = await accountService.open(parsed.data.type, parsed.data.currency, parsed.data.customerId);
  res.status(201).json(account);
});

accountsRouter.get('/:id', async (req: AuthRequest, res) => {
  const account = await accountService.getById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
});

accountsRouter.get('/:id/balance', async (req: AuthRequest, res) => {
  try {
    const balance = await accountService.getBalance(req.params.id);
    res.json({ accountId: req.params.id, balance });
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

accountsRouter.get('/:id/statement', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  try {
    const statement = await accountService.getStatement(req.params.id, { from, to, limit, offset });
    res.json(statement);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

accountsRouter.patch('/:id/freeze', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  try {
    const account = await accountService.freeze(req.params.id, req.body.reason);
    res.json(account);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

accountsRouter.patch('/:id/unfreeze', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  try {
    const account = await accountService.unfreeze(req.params.id);
    res.json(account);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

accountsRouter.patch('/:id/close', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const account = await accountService.close(req.params.id);
    res.json(account);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
