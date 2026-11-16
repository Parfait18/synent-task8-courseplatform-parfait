import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../lib/logger.js';
import type { MailMessage, Mailer } from './mailer.js';

/**
 * Development transport: writes each email as an HTML file in `server/.mail-outbox/`
 * and prints its links, so verification and reset links can be clicked during a demo.
 */
export class OutboxMailer implements Mailer {
  constructor(private readonly directory: string) {}

  async send(message: MailMessage): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeRecipient = message.to.replace(/[^a-z0-9@._-]/gi, '_');
    const file = path.join(this.directory, `${stamp}_${safeRecipient}.html`);
    const header = `<!-- To: ${message.to} | Subject: ${message.subject} -->\n`;
    await writeFile(file, header + message.html, 'utf8');
    logger.info(`Email to ${message.to}: "${message.subject}"`, { file, links: message.links ?? [] });
  }
}
