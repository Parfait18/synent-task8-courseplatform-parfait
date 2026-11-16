import { logger } from './logger.js';

const pending = new Set<Promise<void>>();

/**
 * Runs work after the HTTP response has been sent (fire-and-forget), so that response time does
 * not depend on what the work finds (for example whether an email has an account).
 * Errors are logged with their label, never swallowed silently.
 */
export function runInBackground(label: string, task: () => Promise<unknown>): void {
  const promise: Promise<void> = Promise.resolve()
    .then(task)
    .then(
      () => undefined,
      (error: unknown) => {
        logger.error(`Background task failed: ${label}`, { error: error instanceof Error ? error.message : String(error) });
      },
    )
    .finally(() => pending.delete(promise));
  pending.add(promise);
}

/** Waits for every background task started so far. Used by tests and graceful shutdown. */
export async function flushBackgroundTasks(): Promise<void> {
  while (pending.size > 0) await Promise.all([...pending]);
}
