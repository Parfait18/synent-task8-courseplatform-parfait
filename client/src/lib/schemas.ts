import { z } from 'zod'

/** Mirrors the server rule: 10 to 72 characters, at least one letter and one digit. */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72, 'Use at most 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/\d/, 'Include at least one digit.')

export const emailSchema = z.string().trim().min(1, 'Enter your email address.').pipe(z.email('Enter a valid email address.'))

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password.') })
export const registerSchema = z.object({ name: z.string().trim().min(2, 'Enter your name.').max(80), email: emailSchema, password: passwordSchema })
export const forgotSchema = z.object({ email: emailSchema })
export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'The two passwords are different.' })
