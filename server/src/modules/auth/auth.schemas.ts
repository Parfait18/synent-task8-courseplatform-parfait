import { z } from 'zod';

const email = z.email('Enter a valid email address.').max(254).transform((value) => value.trim().toLowerCase());

/** 10 to 72 characters (bcrypt reads at most 72 bytes), at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one digit.');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(200),
});

export const tokenBodySchema = z.object({ token: z.string().min(20).max(200) });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
