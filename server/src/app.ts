import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { isDatabaseConnected } from './lib/db.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { courseRouter } from './modules/courses/course.routes.js';
import { learningRouter } from './modules/learning/learning.routes.js';
import { paymentRouter, paymentWebhookRouter } from './modules/payments/payment.routes.js';
import { meRouter } from './modules/users/me.routes.js';
import { docsRouter } from './docs/docs.routes.js';

/** Builds the Express application. Kept free of side effects so tests can mount it with supertest. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  // One reverse proxy in front in production (needed for correct client IPs in rate limiting).
  app.set('trust proxy', env.NODE_ENV === 'production' ? 1 : false);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(cookieParser());

  const api = Router();
  // Webhooks need the raw bytes for signature checks, so they are mounted before the JSON parser.
  api.use('/payments/webhooks', paymentWebhookRouter);
  api.use(express.json({ limit: '100kb' }));

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', database: isDatabaseConnected() ? 'connected' : 'disconnected' });
  });
  api.use(docsRouter);
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/courses', courseRouter);
  api.use('/payments', paymentRouter);
  api.use('/learn', learningRouter);
  api.use('/admin', adminRouter);

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
