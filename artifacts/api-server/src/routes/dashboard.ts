import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/kpis', (_req, res) => {
  res.json({
    totalDeposits: 1250000,
    totalWithdrawals: 890000,
    pendingWithdrawals: 12,
    activemerchants: 45,
    successRate: 98.5,
    todayVolume: 125000,
    todayTransactions: 342,
  });
});

dashboardRouter.get('/volume', (_req, res) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { date: d.toISOString().slice(0, 10), deposits: Math.floor(Math.random() * 50000) + 10000, withdrawals: Math.floor(Math.random() * 30000) + 5000 };
  });
  res.json(days);
});

dashboardRouter.get('/activity', (_req, res) => {
  res.json([
    { id: '1', type: 'deposit', amount: 5000, status: 'completed', time: new Date() },
    { id: '2', type: 'withdrawal', amount: 2500, status: 'pending', time: new Date() },
  ]);
});
