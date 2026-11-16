import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';

/** Minimal structured logger writing one JSON line per event to stdout (12-factor logs). */
function write(level: Level, message: string, meta?: Record<string, unknown>) {
  if (env.NODE_ENV === 'test' && level !== 'error') return;
  const line = { time: new Date().toISOString(), level, message, ...meta };
  const output = level === 'error' || level === 'warn' ? console.error : console.log;
  output(env.NODE_ENV === 'production' ? JSON.stringify(line) : `[${level}] ${message}${meta ? ' ' + JSON.stringify(meta) : ''}`);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
