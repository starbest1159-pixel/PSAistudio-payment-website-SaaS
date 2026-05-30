import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type Role = 'admin' | 'operator' | 'teller' | 'customer';

export interface AuthRequest extends Request {
  user?: { username: string; role: Role; userId?: string };
}

/**
 * JWT authentication middleware.
 * Reads JWT from Authorization: Bearer <token> header.
 * Verifies using JWT_SECRET from environment.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — missing or malformed token' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      username: string;
      role: Role;
      userId?: string;
    };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('admin', 'operator')
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role', required: allowedRoles, actual: req.user.role });
    }
    next();
  };
}
