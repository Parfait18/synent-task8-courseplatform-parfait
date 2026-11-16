import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../models/user.model.js';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign({ role: payload.role }, env.JWT_ACCESS_SECRET, {
    subject: payload.sub,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
    issuer: 'kalam-api',
  });
}

/** Returns the payload, or null when the token is missing, malformed, expired or forged. */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'], issuer: 'kalam-api' });
    if (typeof decoded === 'string' || !decoded.sub) return null;
    const role = (decoded as { role?: unknown }).role;
    if (role !== 'user' && role !== 'admin') return null;
    return { sub: decoded.sub, role };
  } catch {
    // An invalid token is an expected outcome, not an error: the caller answers 401.
    return null;
  }
}
