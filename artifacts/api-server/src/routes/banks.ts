import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const banksRouter = Router();
banksRouter.use(requireAuth);

const THAI_BANKS = [
  { code: 'BBL', name: 'Bangkok Bank', color: '#1E3A8A' },
  { code: 'KBANK', name: 'Kasikorn Bank', color: '#006633' },
  { code: 'KTB', name: 'Krungthai Bank', color: '#00AEEF' },
  { code: 'BAY', name: 'Bank of Ayudhya', color: '#FFD700' },
  { code: 'SCB', name: 'Siam Commercial Bank', color: '#4B0082' },
  { code: 'TMB', name: 'TMBThanachart Bank', color: '#003087' },
  { code: 'UOB', name: 'United Overseas Bank', color: '#003893' },
  { code: 'GSB', name: 'Government Savings Bank', color: '#FF69B4' },
];

type VerificationStatus = 'pending' | 'deposit_sent' | 'verified' | 'rejected';

interface BankConnection {
  id: string;
  merchantId: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
  createdAt: Date;
  lastSyncAt: Date | null;
  credentials: string | null;
  verificationStatus: VerificationStatus;
  verificationDepositAmount: string | null;
  verificationDepositSentAt: Date | null;
  verifiedAt: Date | null;
  verificationAttempts: number;
  rejectionReason: string | null;
}

const connections: BankConnection[] = [];

/**
 * Generate a random verification deposit amount between 0.01 and 0.99 THB
 */
function generateDepositAmount(): string {
  const amount = Math.floor(Math.random() * 99) + 1; // 1-99
  return (amount / 100).toFixed(2); // 0.01-0.99
}

// List available banks
banksRouter.get('/list', (_req, res) => res.json(THAI_BANKS));

// List connections for current tenant
banksRouter.get('/connections', (req: AuthRequest, res) => {
  const tenantConnections = req.role === 'admin'
    ? connections
    : connections.filter(c => c.merchantId === req.merchantId);
  res.json(tenantConnections);
});

// Create connection (tenant-scoped)
banksRouter.post('/connections', (req: AuthRequest, res) => {
  const { bankCode, accountNumber, accountName } = req.body;

  if (!bankCode || !accountNumber) {
    return res.status(400).json({ error: 'bankCode and accountNumber are required' });
  }

  const c: BankConnection = {
    id: crypto.randomUUID(),
    merchantId: req.merchantId || 'system',
    bankCode,
    accountNumber,
    accountName: accountName || '',
    isActive: true,
    createdAt: new Date(),
    lastSyncAt: null,
    credentials: null,
    verificationStatus: 'pending',
    verificationDepositAmount: null,
    verificationDepositSentAt: null,
    verifiedAt: null,
    verificationAttempts: 0,
    rejectionReason: null,
  };
  connections.push(c);
  res.status(201).json(c);
});

// Delete connection (tenant-scoped)
banksRouter.delete('/connections/:id', (req: AuthRequest, res) => {
  const conn = connections.find(x => x.id === req.params.id);
  if (!conn) return res.status(404).json({ error: 'Not found' });

  // Tenant can only delete their own connections
  if (req.role !== 'admin' && conn.merchantId !== req.merchantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const i = connections.indexOf(conn);
  connections.splice(i, 1);
  res.json({ message: 'Deleted' });
});

// POST /banks/connections/:id/send-verification
// Generates a random small deposit amount, sets verificationStatus to 'deposit_sent'
banksRouter.post('/connections/:id/send-verification', (req: AuthRequest, res) => {
  const conn = connections.find(x => x.id === req.params.id);
  if (!conn) return res.status(404).json({ error: 'Connection not found' });

  // Tenant can only verify their own connections
  if (req.role !== 'admin' && conn.merchantId !== req.merchantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (conn.verificationStatus !== 'pending') {
    return res.status(400).json({ error: `Cannot send verification for connection with status '${conn.verificationStatus}'` });
  }

  const amount = generateDepositAmount();
  conn.verificationStatus = 'deposit_sent';
  conn.verificationDepositAmount = amount;
  conn.verificationDepositSentAt = new Date();

  res.json({
    id: conn.id,
    verificationStatus: conn.verificationStatus,
    verificationDepositSentAt: conn.verificationDepositSentAt,
    message: `Verification deposit of ฿${amount} has been sent to account ${conn.accountNumber}. Please confirm the exact amount received.`,
  });
});

// POST /banks/connections/:id/confirm-verification
// Tenant submits the amount they received; if matches → verified; if not → increment attempts
banksRouter.post('/connections/:id/confirm-verification', (req: AuthRequest, res) => {
  const { amount } = req.body as { amount?: string | number };
  if (amount === undefined || amount === null) {
    return res.status(400).json({ error: 'amount is required' });
  }

  const conn = connections.find(x => x.id === req.params.id);
  if (!conn) return res.status(404).json({ error: 'Connection not found' });

  // Tenant can only verify their own connections
  if (req.role !== 'admin' && conn.merchantId !== req.merchantId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (conn.verificationStatus !== 'deposit_sent') {
    return res.status(400).json({ error: `Cannot confirm verification for connection with status '${conn.verificationStatus}'` });
  }

  // Compare amounts (both as float for precision within 2 decimal places)
  const submittedAmount = parseFloat(String(amount)).toFixed(2);
  const expectedAmount = parseFloat(conn.verificationDepositAmount!).toFixed(2);

  if (submittedAmount === expectedAmount) {
    conn.verificationStatus = 'verified';
    conn.verifiedAt = new Date();
    conn.rejectionReason = null;

    return res.json({
      id: conn.id,
      verificationStatus: conn.verificationStatus,
      verifiedAt: conn.verifiedAt,
      message: 'Bank account verified successfully!',
    });
  }

  // Incorrect amount
  conn.verificationAttempts += 1;

  if (conn.verificationAttempts >= 3) {
    conn.verificationStatus = 'rejected';
    conn.rejectionReason = 'Maximum verification attempts (3) exceeded. Please contact support or add a new connection.';
    return res.json({
      id: conn.id,
      verificationStatus: conn.verificationStatus,
      verificationAttempts: conn.verificationAttempts,
      rejectionReason: conn.rejectionReason,
      message: 'Verification failed. Maximum attempts exceeded. Connection has been rejected.',
    });
  }

  res.json({
    id: conn.id,
    verificationStatus: conn.verificationStatus,
    verificationAttempts: conn.verificationAttempts,
    remainingAttempts: 3 - conn.verificationAttempts,
    message: `Verification amount does not match. ${3 - conn.verificationAttempts} attempt(s) remaining.`,
  });
});
