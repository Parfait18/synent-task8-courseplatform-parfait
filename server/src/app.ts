import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router, type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { isDatabaseConnected } from './lib/db.js';
import { authenticate } from './middlewares/authenticate.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { authController } from './modules/auth/auth.controller.js';
import { authRouter } from './modules/auth/auth.routes.js';

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
  api.use(express.json({ limit: '100kb' }));

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok', database: isDatabaseConnected() ? 'connected' : 'disconnected' });
  });
  api.use('/auth', authRouter);
  api.get('/me', authenticate, authController.me);

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
