import { Router } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth.js';
import { generatePromptPayQR } from '../lib/promptpay.js';

export const depositsRouter = Router();
depositsRouter.use(requireAuth);

const store: any[] = [];

depositsRouter.get('/', (_req, res) => res.json(store));
depositsRouter.post('/', async (req, res) => {
  const { merchantId, amount, promptpayId } = req.body;
  const ref = crypto.randomUUID().slice(0, 8).toUpperCase();
  const qrPayload = generatePromptPayQR(promptpayId || '0000000000000', amount);
  const qrImage = await QRCode.toDataURL(qrPayload);
  const deposit = { id: crypto.randomUUID(), merchantId, amount, ref, qrPayload, qrImage, status: 'pending', createdAt: new Date() };
  store.push(deposit);
  res.status(201).json(deposit);
});
depositsRouter.get('/:id', (req, res) => {
  const d = store.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});
depositsRouter.patch('/:id/status', (req, res) => {
  const d = store.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  d.status = req.body.status;
  res.json(d);
});
