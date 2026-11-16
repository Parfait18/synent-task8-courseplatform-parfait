import { env, isProduction } from '../config/env.js';
import { MockPaymentProvider } from './mock.provider.js';
import type { PaymentProvider } from './payment-provider.js';
import { RazorpayProvider } from './razorpay.provider.js';

/** Factory: picks the strategy from PAYMENT_PROVIDER (validated at startup). */
function createPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_PROVIDER === 'razorpay') {
    return new RazorpayProvider({ keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, webhookSecret: env.RAZORPAY_WEBHOOK_SECRET });
  }
  if (isProduction) throw new Error('The mock payment provider cannot run in production.');
  return new MockPaymentProvider(env.MOCK_PAYMENT_SECRET);
}

let provider: PaymentProvider = createPaymentProvider();

export function getPaymentProvider(): PaymentProvider {
  return provider;
}

/** Test seam. */
export function setPaymentProvider(next: PaymentProvider) {
  provider = next;
}
