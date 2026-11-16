import { randomBytes } from 'node:crypto';
import type { CreatedOrder, PaymentProvider, ProviderPayment, SignedCallback } from './payment-provider.js';
import { expectedCheckoutSignature, isValidCheckoutSignature } from './signature.js';

/**
 * Local stand-in for Razorpay, used when no test keys are configured. It signs the simulated
 * checkout callback exactly like Razorpay does, so `/payments/verify` runs the same checks.
 * The environment validation refuses this provider when NODE_ENV=production.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;
  readonly publicKey = null;
  private readonly orders = new Map<string, number>();
  private readonly payments = new Map<string, ProviderPayment>();

  constructor(private readonly secret: string) {}

  async createOrder({ amount }: { amount: number }): Promise<CreatedOrder> {
    const orderId = `mock_order_${randomBytes(8).toString('hex')}`;
    this.orders.set(orderId, amount);
    return { orderId, amount, currency: 'INR' };
  }

  /**
   * Plays the role of the Razorpay Checkout popup: "captures" a payment for the order and returns
   * the signed callback the browser would receive. `amount` defaults to the order amount and only
   * exists so tests can simulate a payment whose amount differs from the order.
   */
  simulatePayment(orderId: string, amount?: number): SignedCallback {
    const paymentId = `mock_pay_${randomBytes(8).toString('hex')}`;
    const orderAmount = this.orders.get(orderId);
    this.payments.set(paymentId, { paymentId, orderId, amount: amount ?? orderAmount ?? 0, status: 'captured' });
    return { orderId, paymentId, signature: expectedCheckoutSignature(orderId, paymentId, this.secret) };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: SignedCallback): boolean {
    return isValidCheckoutSignature(orderId, paymentId, signature, this.secret);
  }

  async fetchPayment(paymentId: string): Promise<ProviderPayment | null> {
    return this.payments.get(paymentId) ?? null;
  }

  verifyWebhookSignature(): boolean {
    return false;
  }
}
