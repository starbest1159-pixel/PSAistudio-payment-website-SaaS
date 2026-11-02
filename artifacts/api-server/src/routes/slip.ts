import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

export const slipRouter = Router();
slipRouter.use(requireAuth);

const hashes = new Set<string>();

slipRouter.post('/verify', (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });
  const hash = crypto.createHash('sha256').update(imageBase64).digest('hex');
  if (hashes.has(hash)) {
    return res.status(409).json({ error: 'Duplicate slip', hash });
  }
  hashes.add(hash);
  res.json({ valid: true, hash, message: 'Slip accepted' });
});
