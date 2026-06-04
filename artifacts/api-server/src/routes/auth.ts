import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminHash = process.env.ADMIN_PASSWORD_HASH || '';
  const adminPlain = process.env.ADMIN_PASSWORD || 'admin123';

  const valid = adminHash
    ? await bcrypt.compare(password, adminHash)
    : password === adminPlain;

  if (username !== adminUser || !valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { username, role: 'admin' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  res.json({ token, username, role: 'admin' });
});

authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});
