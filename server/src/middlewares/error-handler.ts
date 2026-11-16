import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { isProduction } from '../config/env.js';
import { AppError } from '../lib/app-error.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound('ROUTE_NOT_FOUND', `No route for ${req.method} ${req.path}.`));
};

/** Turns every error into `{ error: { code, message, details? } }`. Never leaks internals in production. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { code: 'INVALID_ID', message: 'The identifier is not valid.' } });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((issue) => ({ path: issue.path, message: issue.message }));
    res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Some fields are invalid.', details } });
    return;
  }
  // Body parser errors (malformed JSON, payload too large) carry a status.
  const status = typeof error?.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status < 500) {
    res.status(status).json({ error: { code: 'BAD_REQUEST', message: 'The request could not be read.' } });
    return;
  }
  logger.error('Unhandled error', { method: req.method, path: req.path, error: error instanceof Error ? error.stack : String(error) });
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: isProduction ? 'Something went wrong on our side.' : String(error?.message ?? error) },
  });
};
