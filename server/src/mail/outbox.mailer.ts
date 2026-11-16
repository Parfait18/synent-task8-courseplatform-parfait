import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../lib/logger.js';
import type { MailMessage, Mailer } from './mailer.js';

/** Replaces the value of a `token` query parameter so secrets never reach shared logs. */
export function redactTokens(url: string): string {
  return url.replace(/([?&]token=)[^&#]+/g, '$1[redacted]');
}

/**
 * Development transport: writes each email as an HTML file in `server/.mail-outbox/`
 * (git-ignored), so verification and reset links can be clicked during a demo.
 * The environment validation refuses this transport when NODE_ENV=production.
 * Links are printed to the log only outside production, and redacted when `revealLinks` is false.
 */
export class OutboxMailer implements Mailer {
  constructor(
    private readonly directory: string,
    private readonly revealLinks: boolean,
  ) {}

  async send(message: MailMessage): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeRecipient = message.to.replace(/[^a-z0-9@._-]/gi, '_');
    const file = path.join(this.directory, `${stamp}_${safeRecipient}.html`);
    const header = `<!-- To: ${message.to} | Subject: ${message.subject} -->\n`;
    await writeFile(file, header + message.html, { encoding: 'utf8', mode: 0o600 });
    const links = (message.links ?? []).map((link) => (this.revealLinks ? link : redactTokens(link)));
    logger.info(`Email to ${message.to}: "${message.subject}"`, { file, links });
  }
}
