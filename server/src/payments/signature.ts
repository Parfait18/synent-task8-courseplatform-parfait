import { hmacSha256Hex, safeEqualHex } from '../lib/crypto.js';

/** Razorpay Checkout signature: hex HMAC-SHA256 of `${order_id}|${payment_id}` keyed with the API secret. */
export function expectedCheckoutSignature(orderId: string, paymentId: string, secret: string): string {
  return hmacSha256Hex(`${orderId}|${paymentId}`, secret);
}

export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!secret) return false;
  return safeEqualHex(expectedCheckoutSignature(orderId, paymentId, secret), signature);
}
