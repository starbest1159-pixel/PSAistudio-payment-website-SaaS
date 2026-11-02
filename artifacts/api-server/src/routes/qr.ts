import { Router } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth.js';
import { generatePromptPayQR } from '../lib/promptpay.js';

export const qrRouter = Router();
qrRouter.use(requireAuth);

qrRouter.post('/generate', async (req, res) => {
  const { type, id, amount } = req.body;
  try {
    const payload = generatePromptPayQR(id, amount, type);
    const qrImage = await QRCode.toDataURL(payload);
    res.json({ payload, qrImage });
  } catch (err) {
    res.status(400).json({ error: 'QR generation failed' });
  }
});
