import type { PaymentProviderName } from '../models/payment.model.js';

export interface CreatedOrder {
  orderId: string;
  amount: number;
  currency: 'INR';
}

export interface ProviderPayment {
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'authorized' | 'captured' | 'failed' | 'created' | 'refunded';
}

export interface SignedCallback {
  orderId: string;
  paymentId: string;
  signature: string;
}

/**
 * Strategy interface: the enrolment flow depends on this abstraction only, so Razorpay and the
 * local mock are interchangeable and the verification code path is the same for both.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Public key the browser needs to open the checkout (null for the mock). */
  readonly publicKey: string | null;
  createOrder(params: { amount: number; receipt: string; notes: Record<string, string> }): Promise<CreatedOrder>;
  /** HMAC-SHA256 of `order_id|payment_id`, compared in constant time. */
  verifyPaymentSignature(callback: SignedCallback): boolean;
  /** Reads the payment from the provider to confirm its order, amount and status. */
  fetchPayment(paymentId: string): Promise<ProviderPayment | null>;
  /** Captures an authorized payment for exactly `amount` paise (taken from the database). */
  capturePayment(paymentId: string, amount: number): Promise<ProviderPayment>;
  /** Webhook signature on the raw body. Returns false when webhooks are not configured. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
}
