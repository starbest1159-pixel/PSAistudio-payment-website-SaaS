import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { LoanService } from '@psaipay/core';

export const loansRouter = Router();
loansRouter.use(requireAuth);

const loanService = new LoanService();

const originateSchema = z.object({
  accountId: z.string().uuid('Valid account ID required'),
  principal: z.string().min(1, 'Principal required'),
  interestRate: z.string().min(1, 'Interest rate required'),
  term: z.number().int().min(1, 'Term (months) required'),
});

const repaySchema = z.object({
  amount: z.string().min(1, 'Amount required'),
});

loansRouter.get('/', async (req: AuthRequest, res) => {
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await loanService.list({ status, limit, offset });
  res.json({ data, limit, offset });
});

loansRouter.post('/', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const parsed = originateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const loan = await loanService.originate(
      parsed.data.accountId,
      parsed.data.principal,
      parsed.data.interestRate,
      parsed.data.term,
    );
    res.status(201).json(loan);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

loansRouter.get('/:id', async (req: AuthRequest, res) => {
  const loan = await loanService.getById(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  res.json(loan);
});

loansRouter.get('/:id/outstanding', async (req: AuthRequest, res) => {
  try {
    const outstanding = await loanService.getOutstanding(req.params.id);
    res.json(outstanding);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

loansRouter.get('/:id/schedule', async (req: AuthRequest, res) => {
  try {
    const schedule = await loanService.getSchedule(req.params.id);
    res.json(schedule);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

loansRouter.post('/:id/repay', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const parsed = repaySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const repayment = await loanService.repay(req.params.id, parsed.data.amount);
    res.status(201).json(repayment);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
