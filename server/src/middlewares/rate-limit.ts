import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

function limiter(windowMinutes: number, limit: number) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.RATE_LIMIT_DISABLED,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Wait a few minutes and try again.' } },
  });
}

/** Login and registration: 20 attempts per 15 minutes per IP. */
export const authRateLimit = limiter(15, 20);
/** Password reset and verification emails: 5 per 15 minutes per IP. */
export const emailRateLimit = limiter(15, 5);
