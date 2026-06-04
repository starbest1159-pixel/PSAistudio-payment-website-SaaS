import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

/**
 * Withdrawal shape used in the in-memory store.
 */
interface Withdrawal {
  id: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'approved' | 'rejected';
  autoApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
  createdAt: string;
  [key: string]: any;
}

export const withdrawalsRouter = Router();
withdrawalsRouter.use(requireAuth);

// In-memory store for demo / development purposes only.
const store: Withdrawal[] = [];

const DEFAULT_AUTO_APPROVE_LIMIT = 5000;
let AUTO_APPROVE_LIMIT = DEFAULT_AUTO_APPROVE_LIMIT;
if (process.env.AUTO_APPROVE_LIMIT) {
  const v = parseFloat(process.env.AUTO_APPROVE_LIMIT);
  if (!Number.isFinite(v) || v < 0) {
    // Keep default but log a warning
    // eslint-disable-next-line no-console
    console.warn(`Invalid AUTO_APPROVE_LIMIT environment variable: ${process.env.AUTO_APPROVE_LIMIT}. Using default ${DEFAULT_AUTO_APPROVE_LIMIT}`);
  } else {
    AUTO_APPROVE_LIMIT = v;
  }
}

/**
 * Helper: standard JSON response
 */
function ok(res: Response, data: any) {
  return res.json({ success: true, data });
}
function fail(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, error: message });
}

// List withdrawals
withdrawalsRouter.get('/', (_req: Request, res: Response) => {
  return ok(res, store);
});

// Create withdrawal request
withdrawalsRouter.post('/', (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail(res, 400, 'Invalid amount');
    }

    const currency = String(req.body?.currency || 'THB');
    const note = req.body?.note ? String(req.body.note).trim() : undefined;

    const w: Withdrawal = {
      id: crypto.randomUUID(),
      amount,
      currency,
      status: 'pending',
      autoApproved: false,
      createdAt: new Date().toISOString(),
      note,
    };

    if (amount <= AUTO_APPROVE_LIMIT) {
      w.status = 'approved';
      w.autoApproved = true;
      w.approvedAt = new Date().toISOString();
      w.approvedBy = 'system';
    }

    store.push(w);
    return res.status(201).json({ success: true, data: w });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Withdrawals POST error', err);
    return fail(res, 500, 'Internal server error');
  }
});

// Approve a withdrawal (admin action)
withdrawalsRouter.patch('/:id/approve', (req: Request, res: Response) => {
  const w = store.find((x) => x.id === req.params.id);
  if (!w) return fail(res, 404, 'Withdrawal not found');

  if (w.status === 'approved') return fail(res, 400, 'Already approved');

  w.status = 'approved';
  w.approvedBy = (req as any).user?.username || 'admin';
  w.approvedAt = new Date().toISOString();

  return ok(res, w);
});

// Reject a withdrawal (admin action)
withdrawalsRouter.patch('/:id/reject', (req: Request, res: Response) => {
  const w = store.find((x) => x.id === req.params.id);
  if (!w) return fail(res, 404, 'Withdrawal not found');

  if (w.status === 'rejected') return fail(res, 400, 'Already rejected');

  const note = req.body?.note ? String(req.body.note).trim() : undefined;
  w.status = 'rejected';
  if (note) w.note = note;

  return ok(res, w);
});
