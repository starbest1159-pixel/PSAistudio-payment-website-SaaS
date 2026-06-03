import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { username: string; role: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { username: string; role: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const configuredKeys = (process.env.INTEGRATION_API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean);
  if (configuredKeys.length === 0) {
    return res.status(503).json({ error: 'Integration API not configured' });
  }

  if (!configuredKeys.includes(apiKey)) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}
