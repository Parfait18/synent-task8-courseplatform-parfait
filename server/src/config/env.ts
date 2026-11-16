import { z } from 'zod';

/**
 * Environment configuration, validated once at startup (fail fast).
 * Every secret comes from the environment; nothing is hard-coded.
 */
const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4100),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/synent_courses'),
    CLIENT_URL: z.url().default('http://localhost:5175'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

    PAYMENT_PROVIDER: z.enum(['razorpay', 'mock']).default('mock'),
    RAZORPAY_KEY_ID: z.string().default(''),
    RAZORPAY_KEY_SECRET: z.string().default(''),
    RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
    MOCK_PAYMENT_SECRET: z.string().default('local-mock-payment-secret-not-for-production'),

    MAIL_TRANSPORT: z.enum(['outbox', 'smtp']).default('outbox'),
    MAIL_FROM: z.string().default('Kalam <no-reply@kalam.local>'),
    SMTP_HOST: z.string().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: booleanFromString,
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),

    RATE_LIMIT_DISABLED: booleanFromString,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.PAYMENT_PROVIDER === 'mock') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENT_PROVIDER'],
        message: 'The mock payment provider cannot be used when NODE_ENV=production',
      });
    }
    if (env.PAYMENT_PROVIDER === 'razorpay' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['RAZORPAY_KEY_ID'],
        message: 'PAYMENT_PROVIDER=razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
      });
    }
    if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT === 'outbox') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_TRANSPORT'],
        message: 'The outbox mail transport writes secret links to disk and logs: use MAIL_TRANSPORT=smtp in production',
      });
    }
    if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'SMTP_HOST is required for SMTP mail' });
    }
    if (env.NODE_ENV === 'production' && env.RATE_LIMIT_DISABLED) {
      ctx.addIssue({ code: 'custom', path: ['RATE_LIMIT_DISABLED'], message: 'Rate limiting cannot be disabled in production' });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Exported so the startup rules can be unit tested without touching process.env. */
export function parseEnv(source: Record<string, string | undefined>) {
  return envSchema.safeParse(source);
}

function loadEnv(): Env {
  const parsed = parseEnv(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
