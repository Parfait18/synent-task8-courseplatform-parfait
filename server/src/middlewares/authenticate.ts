import type { Request, RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';
import { verifyAccessToken } from '../lib/jwt.js';

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Requires a valid access token. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return next(AppError.unauthorized('ACCESS_TOKEN_INVALID', 'Your session has expired. Sign in again.'));
  req.auth = { userId: payload.sub, role: payload.role };
  next();
};

/** Reads the access token when present; never rejects. Used by public pages that personalise. */
export const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  if (payload) req.auth = { userId: payload.sub, role: payload.role };
  next();
};
