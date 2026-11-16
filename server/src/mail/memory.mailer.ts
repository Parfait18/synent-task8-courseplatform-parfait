import type { MailMessage, Mailer } from './mailer.js';

/** Keeps messages in memory. Used by tests to read verification and reset links. */
export class MemoryMailer implements Mailer {
  readonly messages: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.messages.push(message);
  }

  lastTo(email: string): MailMessage | undefined {
    return [...this.messages].reverse().find((message) => message.to === email);
  }

  clear() {
    this.messages.length = 0;
  }
}
