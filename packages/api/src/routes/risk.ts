import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { riskRules } from '@psaipay/db';
import { eq, desc } from 'drizzle-orm';

export const riskRouter = Router();
riskRouter.use(requireAuth);

const ruleSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.string().min(1, 'Type required'),
  condition: z.string().min(1, 'Condition required'),
  action: z.enum(['flag', 'block', 'review']),
  severity: z.number().min(1).max(5).optional().default(1),
  isActive: z.boolean().optional().default(true),
});

riskRouter.get('/rules', async (_req: AuthRequest, res) => {
  const data = await db
    .select()
    .from(riskRules)
    .orderBy(desc(riskRules.createdAt));

  res.json(data);
});

riskRouter.post('/rules', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const [rule] = await db
    .insert(riskRules)
    .values(parsed.data)
    .returning();

  res.status(201).json(rule);
});

riskRouter.put('/rules/:id', requireRole('admin', 'operator'), async (req: AuthRequest, res) => {
  const [updated] = await db
    .update(riskRules)
    .set(req.body)
    .where(eq(riskRules.id, req.params.id))
    .returning();

  if (!updated) return res.status(404).json({ error: 'Rule not found' });
  res.json(updated);
});

riskRouter.delete('/rules/:id', requireRole('admin'), async (req: AuthRequest, res) => {
  const [deleted] = await db
    .delete(riskRules)
    .where(eq(riskRules.id, req.params.id))
    .returning();

  if (!deleted) return res.status(404).json({ error: 'Rule not found' });
  res.json({ message: 'Deleted' });
});

riskRouter.get('/analysis', (_req: AuthRequest, res) => {
  res.json({ score: 42, flags: [], lastUpdated: new Date() });
});
