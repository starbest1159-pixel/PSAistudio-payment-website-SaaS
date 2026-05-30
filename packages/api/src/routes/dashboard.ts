import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { db } from '@psaipay/db';
import { transactions, deposits, withdrawals, merchants } from '@psaipay/db';
import { sql } from 'drizzle-orm';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/kpis', async (_req: AuthRequest, res) => {
  const [{ depositTotal }] = await db
    .select({ depositTotal: sql<string>`coalesce(sum(${deposits.amount}), 0)` })
    .from(deposits);

  const [{ withdrawalTotal }] = await db
    .select({ withdrawalTotal: sql<string>`coalesce(sum(${withdrawals.amount}), 0)` })
    .from(withdrawals);

  const [{ pendingCount }] = await db
    .select({ pendingCount: sql<number>`count(*)::int` })
    .from(withdrawals)
    .where(sql`${withdrawals.status} = 'pending'`);

  const [{ merchantCount }] = await db
    .select({ merchantCount: sql<number>`count(*)::int` })
    .from(merchants);

  res.json({
    totalDeposits: depositTotal || '0',
    totalWithdrawals: withdrawalTotal || '0',
    pendingWithdrawals: pendingCount || 0,
    activeMerchants: merchantCount || 0,
    successRate: 98.5,
    todayVolume: '0',
    todayTransactions: 0,
  });
});

dashboardRouter.get('/volume', (_req: AuthRequest, res) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      deposits: Math.floor(Math.random() * 50000) + 10000,
      withdrawals: Math.floor(Math.random() * 30000) + 5000,
    };
  });
  res.json(days);
});

dashboardRouter.get('/activity', async (_req: AuthRequest, res) => {
  const recent = await db
    .select()
    .from(transactions)
    .limit(10)
    .orderBy(sql`${transactions.createdAt} desc`);
  res.json(recent);
});
