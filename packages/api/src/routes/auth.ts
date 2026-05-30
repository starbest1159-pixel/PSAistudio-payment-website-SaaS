import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Role } from '../middleware/auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

/** In-memory user store — production would use DB */
interface UserRecord {
  username: string;
  passwordHash: string;
  role: Role;
  userId: string;
}

const users: UserRecord[] = [
  { username: 'admin', passwordHash: '', role: 'admin', userId: 'usr-001' },
  { username: 'operator', passwordHash: '', role: 'operator', userId: 'usr-002' },
  { username: 'teller', passwordHash: '', role: 'teller', userId: 'usr-003' },
  { username: 'customer', passwordHash: '', role: 'customer', userId: 'usr-004' },
];

const PLAIN_PASSWORDS: Record<string, string> = {
  admin: process.env.ADMIN_PASSWORD || 'admin123',
  operator: process.env.OPERATOR_PASSWORD || 'operator123',
  teller: process.env.TELLER_PASSWORD || 'teller123',
  customer: process.env.CUSTOMER_PASSWORD || 'customer123',
};

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const expectedPassword = PLAIN_PASSWORDS[username] || '';
  const valid = user.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : password === expectedPassword;

  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username: user.username, role: user.role, userId: user.userId },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({ token, username: user.username, role: user.role, userId: user.userId });
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});
