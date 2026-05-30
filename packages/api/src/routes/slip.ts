import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { slipHashes } from '@psaipay/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const slipRouter = Router();
slipRouter.use(requireAuth);

const verifySchema = z.object({
  imageBase64: z.string().min(1, 'Image data required'),
});

slipRouter.post('/verify', async (req: AuthRequest, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const hash = crypto.createHash('sha256').update(parsed.data.imageBase64).digest('hex');

  // Check for duplicate
  const [existing] = await db
    .select()
    .from(slipHashes)
    .where(eq(slipHashes.hash, hash));

  if (existing) {
    return res.status(409).json({ error: 'Duplicate slip', hash, depositId: existing.depositId });
  }

  // Store the hash
  await db.insert(slipHashes).values({ hash });

  res.json({ valid: true, hash, message: 'Slip accepted' });
});
