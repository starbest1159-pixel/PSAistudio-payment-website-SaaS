import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { CardService } from '@psaipay/core';

export const cardsRouter = Router();
cardsRouter.use(requireAuth);

const cardService = new CardService();

const issueSchema = z.object({
  accountId: z.string().uuid('Valid account ID required'),
  cardType: z.enum(['debit', 'credit']),
  brand: z.enum(['visa', 'mastercard']),
});

const authorizeSchema = z.object({
  amount: z.string().min(1, 'Amount required'),
  merchantName: z.string().min(1, 'Merchant name required'),
  merchantCategory: z.string().optional(),
});

cardsRouter.get('/', async (req: AuthRequest, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const data = await cardService.list({ limit, offset });
  res.json({ data, limit, offset });
});

cardsRouter.get('/account/:accountId', async (req: AuthRequest, res) => {
  const data = await cardService.listByAccount(req.params.accountId);
  res.json(data);
});

cardsRouter.post('/', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const parsed = issueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const card = await cardService.issue(parsed.data.accountId, parsed.data.cardType, parsed.data.brand);
    res.status(201).json(card);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

cardsRouter.get('/:id', async (req: AuthRequest, res) => {
  const card = await cardService.getById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Card not found' });
  res.json(card);
});

cardsRouter.patch('/:id/block', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  try {
    const card = await cardService.block(req.params.id);
    res.json(card);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

cardsRouter.patch('/:id/unblock', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  try {
    const card = await cardService.unblock(req.params.id);
    res.json(card);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

cardsRouter.post('/:id/authorize', requireRole('admin', 'operator', 'teller'), async (req: AuthRequest, res) => {
  const parsed = authorizeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const auth = await cardService.authorize(
      req.params.id,
      parsed.data.amount,
      parsed.data.merchantName,
      parsed.data.merchantCategory,
    );
    res.status(201).json(auth);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

cardsRouter.post('/auth/:authId/capture', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  try {
    const auth = await cardService.capture(req.params.authId);
    res.json(auth);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

cardsRouter.post('/auth/:authId/reverse', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  try {
    const auth = await cardService.reverse(req.params.authId);
    res.json(auth);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
