import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import { AppError } from '../lib/app-error.js';

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Parses body, query and params with zod before the controller runs.
 * Express 5 makes `req.query` read-only, so parsed values live on `req.validated`.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const validated: NonNullable<Request['validated']> = {};
    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({ path: [key, ...issue.path].join('.'), message: issue.message }));
        return next(AppError.badRequest('VALIDATION_FAILED', 'Some fields are invalid.', details));
      }
      validated[key] = result.data;
    }
    req.validated = validated;
    next();
  };
}

/** Typed accessors for controllers. */
export const input = {
  body: <T>(req: Request) => req.validated?.body as T,
  query: <T>(req: Request) => req.validated?.query as T,
  params: <T>(req: Request) => req.validated?.params as T,
};
