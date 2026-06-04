import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { username?: string; role: string; merchantId?: string; tenantDbName?: string; email?: string };
  merchantId?: string;
  tenantDbName?: string;
  role?: string;
}

/**
 * JWT verification middleware.
 * After verifying JWT, attaches req.merchantId, req.tenantDbName, req.role to the request.
 * Falls back to legacy username/role format for backward compatibility.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      username?: string;
      role: string;
      merchantId?: string;
      tenantDbName?: string;
      email?: string;
    };

    // Attach legacy user object
    req.user = payload;

    // Attach multi-tenant fields
    req.merchantId = payload.merchantId || 'system';
    req.tenantDbName = payload.tenantDbName || 'system';
    req.role = payload.role;

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
