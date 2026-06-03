import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

// In-memory merchant store for multi-tenant registration (mirrors DB schema until full migration)
interface MerchantRecord {
  id: string;
  name: string;
  code: string;
  email: string;
  passwordHash: string;
  tenantDbName: string;
  subscriptionStatus: string;
  role: string;
  promptpayId: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  autoApproveLimit: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const merchantStore: MerchantRecord[] = [];

// POST /auth/register — create merchant + provision tenant DB
authRouter.post('/register', async (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check duplicate email
  if (merchantStore.some(m => m.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  const code = `MRC${Date.now().toString(36).toUpperCase()}`;
  const tenantDbName = `tenant_${code.toLowerCase()}`;

  const merchant: MerchantRecord = {
    id,
    name,
    code,
    email,
    passwordHash,
    tenantDbName,
    subscriptionStatus: 'active',
    role: 'tenant',
    promptpayId: null,
    webhookUrl: null,
    webhookSecret: null,
    autoApproveLimit: '0',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  merchantStore.push(merchant);

  // Tenant DB provisioning placeholder — in production this creates a new DB
  console.log(`[tenant-provision] Provisioning tenant DB: ${tenantDbName} for merchant ${id}`);

  const token = jwt.sign(
    { merchantId: id, email, tenantDbName, role: 'tenant' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.status(201).json({
    token,
    merchant: { id, name, code, email, tenantDbName, subscriptionStatus: 'active', role: 'tenant' },
  });
});

// POST /auth/login — validate credentials, return JWT with tenantId
authRouter.post('/login', async (req, res) => {
  const { username, email, password } = req.body as { username?: string; email?: string; password?: string };
  const loginEmail = email || username;

  // 1. Try admin fallback first
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminHash = process.env.ADMIN_PASSWORD_HASH || '';
  const adminPlain = process.env.ADMIN_PASSWORD || 'admin123';

  if (loginEmail === adminUser) {
    const valid = adminHash
      ? await bcrypt.compare(password || '', adminHash)
      : password === adminPlain;

    if (valid) {
      const token = jwt.sign(
        { username: adminUser, role: 'admin', merchantId: 'system', tenantDbName: 'system', email: adminUser },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );
      return res.json({ token, username: adminUser, role: 'admin', merchantId: 'system', tenantDbName: 'system' });
    }
  }

  // 2. Try merchant lookup
  if (!loginEmail || !password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const merchant = merchantStore.find(m => m.email === loginEmail);
  if (!merchant) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, merchant.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { merchantId: merchant.id, email: merchant.email, tenantDbName: merchant.tenantDbName, role: merchant.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    username: merchant.email,
    role: merchant.role,
    merchantId: merchant.id,
    tenantDbName: merchant.tenantDbName,
    email: merchant.email,
  });
});

// POST /auth/me — return current user info
authRouter.post('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      merchantId?: string;
      email?: string;
      tenantDbName?: string;
      role?: string;
      username?: string;
    };

    // Admin user
    if (payload.role === 'admin') {
      return res.json({ username: payload.username, role: 'admin', merchantId: 'system', tenantDbName: 'system' });
    }

    // Merchant user
    const merchant = merchantStore.find(m => m.id === payload.merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.json({
      merchantId: merchant.id,
      email: merchant.email,
      name: merchant.name,
      code: merchant.code,
      tenantDbName: merchant.tenantDbName,
      subscriptionStatus: merchant.subscriptionStatus,
      role: merchant.role,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

// Export store for use in other modules (e.g., banks router for merchantId lookup)
export { merchantStore };
