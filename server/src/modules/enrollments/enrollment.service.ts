import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { runInBackground } from '../../lib/background.js';
import { logger } from '../../lib/logger.js';
import { toPaginated, type PaginationQuery } from '../../lib/pagination.js';
import { sendMailSafely } from '../../mail/index.js';
import { enrollmentEmail } from '../../mail/templates.js';
import type { Course } from '../../models/course.model.js';
import { getPaymentProvider } from '../../payments/index.js';
import type { SignedCallback } from '../../payments/payment-provider.js';
import { presentCourseCard } from '../courses/course.presenter.js';
import { courseRepository } from '../courses/course.repository.js';
import { computeProgress } from '../learning/progress.js';
import { paymentRepository } from '../payments/payment.repository.js';
import { userRepository } from '../users/user.repository.js';
import { enrollmentRepository } from './enrollment.repository.js';

export const formatInr = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

export type CheckoutResult =
  | { type: 'enrolled'; courseId: string }
  | {
      type: 'order';
      provider: 'razorpay' | 'mock';
      orderId: string;
      amount: number;
      currency: 'INR';
      keyId: string | null;
      course: { id: string; title: string };
      prefill: { name: string; email: string };
    };

/**
 * Creates the enrolment (idempotent) and, when it is new, sends the confirmation email after the
 * response. Shared by free enrolment, verified checkout and the Razorpay webhook.
 */
async function enroll(userId: Types.ObjectId | string, course: Pick<Course, '_id' | 'title'>, payment: { _id: Types.ObjectId; amount: number } | null) {
  const { created } = await enrollmentRepository.upsert(userId, course._id, payment?._id ?? null);
  if (created) {
    runInBackground('enrolment email', async () => {
      const user = await userRepository.findById(userId);
      if (!user) return;
      const url = `${env.CLIENT_URL}/learn/${course._id.toString()}`;
      await sendMailSafely(enrollmentEmail(user.email, user.name, course.title, payment ? formatInr(payment.amount) : 'free', url));
    });
  }
  return created;
}

/**
 * Marks an order paid and enrols its owner, atomically and idempotently:
 * - the created → paid transition is a conditional update, so only one caller performs it;
 * - a caller that lost the race proceeds only if the order was paid with the same payment id
 *   (a replay), and is rejected if it carries a different payment id;
 * - the enrolment is an upsert on the unique (user, course) index.
 */
async function completePayment(payment: { _id: Types.ObjectId; user: Types.ObjectId; course: Types.ObjectId; amount: number }, paymentId: string) {
  const transitioned = await paymentRepository.markPaid(payment._id, paymentId);
  if (!transitioned) {
    const current = await paymentRepository.findById(payment._id);
    if (current?.status !== 'paid' || current.paymentId !== paymentId) {
      throw AppError.conflict('PAYMENT_ALREADY_PROCESSED', 'This order was already settled with another payment.');
    }
  }
  const course = await courseRepository.findById(payment.course);
  if (!course) throw AppError.notFound('COURSE_NOT_FOUND', 'The course of this payment no longer exists.');
  await enroll(payment.user, course, payment);
  return course;
}

export const enrollmentService = {
  async checkout(userId: string, courseId: string): Promise<CheckoutResult> {
    const [user, course] = await Promise.all([userRepository.findById(userId), courseRepository.findById(courseId)]);
    if (!user) throw AppError.unauthorized('ACCOUNT_NOT_FOUND', 'This account no longer exists.');
    if (!course || !course.isPublished) throw AppError.notFound('COURSE_NOT_FOUND', 'This course does not exist or is not published.');
    if (!user.emailVerifiedAt) throw AppError.forbidden('EMAIL_NOT_VERIFIED', 'Confirm your email address before you enrol.');
    if (await enrollmentRepository.findOne(userId, course._id)) throw AppError.conflict('ALREADY_ENROLLED', 'You are already enrolled in this course.');

    if (course.price === 0) {
      await enroll(user._id, course, null);
      return { type: 'enrolled', courseId: course._id.toString() };
    }

    const provider = getPaymentProvider();
    // The amount always comes from the database, in paise. Nothing in the request can change it.
    const amount = course.price * 100;
    const reusable = await paymentRepository.findReusableOrder(user._id, course._id, amount, provider.name);
    let orderId = reusable?.orderId;
    if (!orderId) {
      const order = await provider.createOrder({ amount, receipt: `kalam_${Date.now().toString(36)}`, notes: { courseId: course._id.toString(), userId: user._id.toString() } });
      if (order.amount !== amount) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment provider returned an unexpected amount.');
      await paymentRepository.create({ user: user._id, course: course._id, provider: provider.name, orderId: order.orderId, amount });
      orderId = order.orderId;
    }
    return {
      type: 'order',
      provider: provider.name,
      orderId,
      amount,
      currency: 'INR',
      keyId: provider.publicKey,
      course: { id: course._id.toString(), title: course.title },
      prefill: { name: user.name, email: user.email },
    };
  },

  /** Verifies the checkout callback and enrols the user. */
  async verifyPayment(userId: string, callback: SignedCallback) {
    const provider = getPaymentProvider();
    const payment = await paymentRepository.findByOrderId(callback.orderId);
    if (!payment || payment.user.toString() !== userId || payment.provider !== provider.name) {
      throw AppError.notFound('ORDER_NOT_FOUND', 'This payment order does not exist.');
    }
    if (!provider.verifyPaymentSignature(callback)) {
      logger.warn('Rejected payment signature', { orderId: callback.orderId });
      throw AppError.badRequest('PAYMENT_SIGNATURE_INVALID', 'The payment could not be verified. You have not been charged twice; contact support if money left your account.');
    }
    if (payment.status === 'paid') {
      // Replay of the same verified callback: idempotent, returns the existing enrolment.
      if (payment.paymentId === callback.paymentId) return { courseId: payment.course.toString(), alreadyProcessed: true };
      throw AppError.conflict('PAYMENT_ALREADY_PROCESSED', 'This order was already settled with another payment.');
    }
    if (payment.status !== 'created') throw AppError.badRequest('PAYMENT_NOT_COMPLETED', 'This order can no longer be paid. Start a new checkout.');

    // The signature proves the callback came from the provider; the provider's own record proves
    // the payment matches this order and its stored amount.
    let providerPayment = await provider.fetchPayment(callback.paymentId);
    const matchesOrder = (p: typeof providerPayment) => Boolean(p && p.orderId === payment.orderId && p.amount === payment.amount);
    if (!matchesOrder(providerPayment)) {
      await paymentRepository.markFailed(payment._id);
      throw AppError.badRequest('PAYMENT_AMOUNT_MISMATCH', 'The payment does not match the order amount.');
    }
    // Money is only moved once the payment is captured. An authorized payment is captured here,
    // for the amount stored in the database, before any enrolment.
    if (providerPayment!.status === 'authorized') {
      providerPayment = await provider.capturePayment(callback.paymentId, payment.amount);
    }
    if (!matchesOrder(providerPayment) || providerPayment!.status !== 'captured') {
      throw AppError.badRequest('PAYMENT_NOT_CAPTURED', 'The payment was not captured. You have not been enrolled.');
    }
    const course = await completePayment(payment, callback.paymentId);
    return { courseId: course._id.toString(), alreadyProcessed: false };
  },

  /** Razorpay webhook (`payment.captured`): completes orders whose browser callback never arrived. */
  async handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
    const provider = getPaymentProvider();
    if (provider.name !== 'razorpay') throw AppError.notFound('WEBHOOK_DISABLED', 'Webhooks are not enabled.');
    if (!signature || !provider.verifyWebhookSignature(rawBody, signature)) {
      throw AppError.badRequest('WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature.');
    }
    const event = JSON.parse(rawBody.toString('utf8')) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } } };
    const entity = event.payload?.payment?.entity;
    if (event.event !== 'payment.captured' || !entity?.order_id || !entity.id) return { handled: false };
    const payment = await paymentRepository.findByOrderId(entity.order_id);
    if (!payment || payment.amount !== entity.amount) {
      logger.warn('Webhook for an unknown order or a different amount', { orderId: entity.order_id });
      return { handled: false };
    }
    try {
      await completePayment(payment, entity.id);
    } catch (error) {
      // Already settled with another payment id: acknowledge so Razorpay stops retrying, but log it.
      if (error instanceof AppError && error.code === 'PAYMENT_ALREADY_PROCESSED') {
        logger.warn('Webhook for an order settled with another payment', { orderId: entity.order_id });
        return { handled: false };
      }
      throw error;
    }
    return { handled: true };
  },

  /** Mock provider only: plays the Razorpay Checkout popup for the owner of the order. */
  async simulateMockPayment(userId: string, orderId: string) {
    const provider = getPaymentProvider();
    if (provider.name !== 'mock' || !('simulatePayment' in provider)) throw AppError.notFound('MOCK_DISABLED', 'Test payments are disabled.');
    const payment = await paymentRepository.findByOrderId(orderId);
    if (!payment || payment.user.toString() !== userId || payment.status !== 'created') {
      throw AppError.notFound('ORDER_NOT_FOUND', 'This payment order does not exist.');
    }
    return (provider as unknown as { simulatePayment(orderId: string): SignedCallback }).simulatePayment(orderId);
  },

  async listMine(userId: string, page: PaginationQuery) {
    const { items, total } = await enrollmentRepository.findForUser(userId, page);
    const rows = items
      .filter((enrollment) => enrollment.course && typeof enrollment.course === 'object')
      .map((enrollment) => {
        const course = enrollment.course as unknown as Course;
        return {
          id: enrollment._id.toString(),
          enrolledAt: enrollment.createdAt.toISOString(),
          course: presentCourseCard(course),
          progress: computeProgress(course, enrollment.completedLessons),
          lastLessonId: enrollment.lastLesson?.toString() ?? null,
        };
      });
    return toPaginated(rows, total, page);
  },
};
