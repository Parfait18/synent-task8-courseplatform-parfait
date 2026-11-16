import { env } from './config/env.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './lib/db.js';
import { flushBackgroundTasks } from './lib/background.js';
import { logger } from './lib/logger.js';

async function main() {
  await connectDatabase(env.MONGODB_URI);
  const server = createApp().listen(env.PORT, () => {
    logger.info(`Kalam API listening on http://localhost:${env.PORT}/api/v1`, { docs: `http://localhost:${env.PORT}/api/v1/docs`, paymentProvider: env.PAYMENT_PROVIDER, mail: env.MAIL_TRANSPORT });
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      flushBackgroundTasks()
        .then(disconnectDatabase)
        .finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('Failed to start the server', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
