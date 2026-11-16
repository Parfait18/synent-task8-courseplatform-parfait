import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { expectedCheckoutSignature, isValidCheckoutSignature } from '../src/payments/signature.js';

const secret = 'rzp_test_secret';
const reference = (orderId: string, paymentId: string) => createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

describe('Razorpay checkout signature', () => {
  it('should match the HMAC-SHA256 of order_id|payment_id', () => {
    expect(expectedCheckoutSignature('order_1', 'pay_1', secret)).toBe(reference('order_1', 'pay_1'));
  });

  it('should accept a valid signature', () => {
    expect(isValidCheckoutSignature('order_1', 'pay_1', reference('order_1', 'pay_1'), secret)).toBe(true);
  });

  it('should reject a signature for another order, a truncated one, non-hex input and an empty secret', () => {
    const valid = reference('order_1', 'pay_1');
    expect(isValidCheckoutSignature('order_2', 'pay_1', valid, secret)).toBe(false);
    expect(isValidCheckoutSignature('order_1', 'pay_1', valid.slice(0, 40), secret)).toBe(false);
    expect(isValidCheckoutSignature('order_1', 'pay_1', 'z'.repeat(64), secret)).toBe(false);
    expect(isValidCheckoutSignature('order_1', 'pay_1', valid, '')).toBe(false);
  });
});
