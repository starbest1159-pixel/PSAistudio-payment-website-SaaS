import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { dispatchTransactionWebhook } from '../lib/webhook-dispatcher.js';

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

const store: any[] = [];

const STATUS_CHANGES = new Set(['completed', 'failed', 'refunded']);

transactionsRouter.get('/', (req, res) => {
  const { status, type, merchantId } = req.query;
  let data = store;
  if (status) data = data.filter(x => x.status === status);
  if (type) data = data.filter(x => x.type === type);
  if (merchantId) data = data.filter(x => x.merchantId === merchantId);
  res.json({ data, total: data.length });
});
transactionsRouter.get('/:id', (req, res) => {
  const t = store.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});
transactionsRouter.patch('/:id/status', (req, res) => {
  const t = store.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const previousStatus = t.status;
  t.status = req.body.status;
  t.updatedAt = new Date();

  // Dispatch webhook if status changed to a terminal state and callbackUrl is set
  if (STATUS_CHANGES.has(t.status) && t.status !== previousStatus && t.callbackUrl) {
    t.webhookAttempts = (t.webhookAttempts || 0) + 1;
    dispatchTransactionWebhook(
      t.callbackUrl,
      t.id,
      t.externalRef || null,
      t.status,
      t.amount,
    );
  }

  res.json(t);
});
