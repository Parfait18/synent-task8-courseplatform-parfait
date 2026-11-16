import type { RequestHandler } from 'express';
import { AppError } from '../lib/app-error.js';
import { UserModel, type UserRole } from '../models/user.model.js';

/**
 * Must run after `authenticate`. The role is re-read from the database rather than trusted
 * from the token, so a demoted admin loses access immediately instead of after 15 minutes.
 */
export function requireRole(role: UserRole): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) return next(AppError.unauthorized());
    const user = await UserModel.findById(req.auth.userId).select('role').lean();
    if (!user) return next(AppError.unauthorized('ACCOUNT_NOT_FOUND', 'This account no longer exists.'));
    if (user.role !== role) return next(AppError.forbidden('ROLE_REQUIRED', 'This area is reserved for administrators.'));
    req.auth.role = user.role;
    next();
  };
}
