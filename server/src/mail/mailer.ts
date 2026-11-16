export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Links worth printing in development logs (verification, reset). */
  links?: string[];
}

/** Abstraction over email delivery so services do not depend on a transport. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
