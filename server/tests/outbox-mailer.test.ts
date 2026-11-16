import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../src/lib/logger.js';
import { OutboxMailer, redactTokens } from '../src/mail/outbox.mailer.js';

const message = { to: 'a@example.com', subject: 'Reset', html: '<p>hi</p>', text: 'hi', links: ['http://localhost:5175/reset-password?token=SECRET123&x=1'] };

describe('outbox mailer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should redact the token query parameter', () => {
    expect(redactTokens('http://h/verify-email?token=abc')).toBe('http://h/verify-email?token=[redacted]');
    expect(redactTokens('http://h/x?a=1&token=abc&b=2')).toBe('http://h/x?a=1&token=[redacted]&b=2');
  });

  it('should never log the token when links are not revealed', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'kalam-outbox-'));
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await new OutboxMailer(directory, false).send(message);
    expect(JSON.stringify(info.mock.calls)).not.toContain('SECRET123');
    const [file] = await readdir(directory);
    expect(await readFile(path.join(directory, file!), 'utf8')).toContain('<p>hi</p>');
  });

  it('should log clickable links when revealing is allowed (development)', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'kalam-outbox-'));
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await new OutboxMailer(directory, true).send(message);
    expect(JSON.stringify(info.mock.calls)).toContain('SECRET123');
  });
});
