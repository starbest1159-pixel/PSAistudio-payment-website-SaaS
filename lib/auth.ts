import jwt from 'jsonwebtoken'

export interface JWTPayload {
  user_id: string
  email: string
  role: 'admin' | 'user'
  iat?: number
  exp?: number
}

export function verifyJWT(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return jwt.verify(token, secret) as JWTPayload
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

export function requireAuth(request: Request): JWTPayload {
  const authHeader = request.headers.get('Authorization')
  const token = extractBearerToken(authHeader)
  if (!token) throw new Error('Missing authorization token')
  return verifyJWT(token)
}

export function requireAdmin(request: Request): JWTPayload {
  const payload = requireAuth(request)
  if (payload.role !== 'admin') throw new Error('Admin access required')
  return payload
}
