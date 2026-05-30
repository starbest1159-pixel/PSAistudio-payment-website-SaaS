import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { FxService } from '@psaipay/core';

export const fxRouter = Router();
fxRouter.use(requireAuth);

const fxService = new FxService();

const rateSchema = z.object({
  baseCurrency: z.string().length(3),
  quoteCurrency: z.string().length(3),
  rate: z.string().min(1, 'Rate required'),
  source: z.string().optional(),
});

const convertSchema = z.object({
  accountId: z.string().uuid('Valid account ID required'),
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  amount: z.string().min(1, 'Amount required'),
});

fxRouter.get('/rates', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await fxService.listRates({ limit, offset });
  res.json({ data, limit, offset });
});

fxRouter.get('/rates/:from/:to', async (req: AuthRequest, res) => {
  try {
    const rateInfo = await fxService.getRate(req.params.from, req.params.to);
    res.json(rateInfo);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

fxRouter.post('/rates', requireRole('admin'), async (req: AuthRequest, res) => {
  const parsed = rateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const rate = await fxService.addRate(
    parsed.data.baseCurrency,
    parsed.data.quoteCurrency,
    parsed.data.rate,
    parsed.data.source,
  );
  res.status(201).json(rate);
});

fxRouter.post('/convert', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const parsed = convertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const result = await fxService.convert(
      parsed.data.accountId,
      parsed.data.fromCurrency,
      parsed.data.toCurrency,
      parsed.data.amount,
    );
    res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
