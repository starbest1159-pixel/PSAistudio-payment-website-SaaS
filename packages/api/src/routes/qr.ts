import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { generatePromptPayQR } from '../lib/promptpay.js';

export const qrRouter = Router();
qrRouter.use(requireAuth);

const generateSchema = z.object({
  type: z.enum(['phone', 'taxid', 'ewallet']).optional().default('phone'),
  id: z.string().min(1, 'ID required'),
  amount: z.number().positive().optional(),
});

qrRouter.post('/generate', async (req: AuthRequest, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  try {
    const { id, amount, type } = parsed.data;
    const payload = generatePromptPayQR(id, amount, type);
    const qrImage = await QRCode.toDataURL(payload);
    res.json({ payload, qrImage });
  } catch (err) {
    res.status(400).json({ error: 'QR generation failed' });
  }
});
