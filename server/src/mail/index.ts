import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import type { MailMessage, Mailer } from './mailer.js';
import { OutboxMailer } from './outbox.mailer.js';
import { SmtpMailer } from './smtp.mailer.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function createMailer(): Mailer {
  if (env.MAIL_TRANSPORT === 'smtp') {
    return new SmtpMailer({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, user: env.SMTP_USER, pass: env.SMTP_PASS, from: env.MAIL_FROM });
  }
  return new OutboxMailer(path.join(serverRoot, '.mail-outbox'));
}

let mailer: Mailer = createMailer();

/** Test seam: replace the transport (for example with MemoryMailer). */
export function setMailer(next: Mailer) {
  mailer = next;
}

/**
 * Sends an email without failing the calling request: a registration or an enrolment must not
 * be rolled back because the mail server is down. Failures are logged, never swallowed silently.
 */
export async function sendMailSafely(message: MailMessage): Promise<boolean> {
  try {
    await mailer.send(message);
    return true;
  } catch (error) {
    logger.error('Email delivery failed', { to: message.to, subject: message.subject, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
