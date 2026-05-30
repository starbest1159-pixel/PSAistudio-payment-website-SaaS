import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { settings } from '@psaipay/db';
import { eq } from 'drizzle-orm';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get('/', async (_req: AuthRequest, res) => {
  const data = await db.select().from(settings);
  // Convert key-value pairs to a flat object
  const result: Record<string, string> = {};
  for (const row of data) {
    result[row.key] = row.value || '';
  }
  res.json(result);
});

settingsRouter.patch('/', requireRole('admin'), async (req: AuthRequest, res) => {
  const updates = req.body;
  const results: Record<string, string> = {};

  for (const [key, value] of Object.entries(updates)) {
    // Upsert each setting
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key));

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: String(value) });
    }
    results[key] = String(value);
  }

  res.json(results);
});
