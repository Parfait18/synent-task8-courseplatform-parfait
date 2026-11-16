import { z } from 'zod';

const providerId = z.string().regex(/^[A-Za-z0-9_]{6,64}$/, 'Invalid identifier.');

export const verifyPaymentSchema = z.object({
  orderId: providerId,
  paymentId: providerId,
  signature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid signature.'),
});

export const orderParamsSchema = z.object({ orderId: providerId });
