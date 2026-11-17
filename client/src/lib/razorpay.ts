import type { CheckoutResult, SignedCallback } from './types'

type Order = Extract<CheckoutResult, { type: 'order' }>

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open(): void
  on(event: 'payment.failed', handler: (response: { error: { description?: string } }) => void): void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Razorpay Checkout could not load. Check your connection and try again.'))
    }
    document.body.appendChild(script)
  })
  return scriptPromise
}

export class CheckoutDismissedError extends Error {
  constructor() {
    super('Payment cancelled.')
  }
}

/**
 * Opens Razorpay Checkout for a server-created order and resolves with the signed callback.
 * The amount shown comes from the order; the server re-checks it before enrolling.
 */
export async function openRazorpayCheckout(order: Order): Promise<SignedCallback> {
  await loadScript()
  if (!window.Razorpay || !order.keyId) throw new Error('Razorpay is not configured.')
  const Razorpay = window.Razorpay
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: 'Kalam',
      description: order.course.title,
      prefill: order.prefill,
      theme: { color: '#1B2560' },
      handler: (response: RazorpayResponse) =>
        resolve({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
      modal: { ondismiss: () => reject(new CheckoutDismissedError()) },
    })
    checkout.on('payment.failed', (response) => reject(new Error(response.error.description ?? 'The payment failed.')))
    checkout.open()
  })
}
