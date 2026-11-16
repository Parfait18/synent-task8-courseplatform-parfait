import Razorpay from 'razorpay';
import { hmacSha256Hex, safeEqualHex } from '../lib/crypto.js';
import type { CreatedOrder, PaymentProvider, ProviderPayment, SignedCallback } from './payment-provider.js';
import { isValidCheckoutSignature } from './signature.js';

interface RazorpayOptions {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

/** Razorpay in test mode (or live mode with live keys: nothing in the code is test-specific). */
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay' as const;
  readonly publicKey: string;
  private readonly client: Razorpay;

  constructor(private readonly options: RazorpayOptions) {
    this.publicKey = options.keyId;
    this.client = new Razorpay({ key_id: options.keyId, key_secret: options.keySecret });
  }

  async createOrder({ amount, receipt, notes }: { amount: number; receipt: string; notes: Record<string, string> }): Promise<CreatedOrder> {
    const order = await this.client.orders.create({ amount, currency: 'INR', receipt, notes });
    return { orderId: order.id, amount: Number(order.amount), currency: 'INR' };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: SignedCallback): boolean {
    return isValidCheckoutSignature(orderId, paymentId, signature, this.options.keySecret);
  }

  async fetchPayment(paymentId: string): Promise<ProviderPayment | null> {
    const payment = await this.client.payments.fetch(paymentId);
    if (!payment?.order_id) return null;
    return { paymentId: payment.id, orderId: payment.order_id, amount: Number(payment.amount), status: payment.status as ProviderPayment['status'] };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!this.options.webhookSecret) return false;
    return safeEqualHex(hmacSha256Hex(rawBody.toString('utf8'), this.options.webhookSecret), signature);
  }
}
