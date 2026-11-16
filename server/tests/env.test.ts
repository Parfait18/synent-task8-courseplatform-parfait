import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const base = { JWT_ACCESS_SECRET: 'x'.repeat(40), MAIL_TRANSPORT: 'smtp', SMTP_HOST: 'smtp.example.com', PAYMENT_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'secret' };

const issuesFor = (source: Record<string, string>) => {
  const result = parseEnv(source);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('environment validation', () => {
  it('should accept a complete production configuration', () => {
    expect(issuesFor({ ...base, NODE_ENV: 'production' })).toEqual([]);
  });

  it('should reject the outbox mail transport when NODE_ENV is production', () => {
    expect(issuesFor({ ...base, NODE_ENV: 'production', MAIL_TRANSPORT: 'outbox' })).toContain('MAIL_TRANSPORT');
  });

  it('should reject the mock payment provider when NODE_ENV is production', () => {
    expect(issuesFor({ ...base, NODE_ENV: 'production', PAYMENT_PROVIDER: 'mock' })).toContain('PAYMENT_PROVIDER');
  });

  it('should reject razorpay without keys', () => {
    expect(issuesFor({ ...base, RAZORPAY_KEY_ID: '', RAZORPAY_KEY_SECRET: '' })).toContain('RAZORPAY_KEY_ID');
  });

  it('should reject a short JWT secret', () => {
    expect(issuesFor({ ...base, JWT_ACCESS_SECRET: 'short' })).toContain('JWT_ACCESS_SECRET');
  });
});
