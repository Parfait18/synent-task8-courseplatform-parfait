import { describe, expect, it, vi } from 'vitest';
import { EnrollmentModel } from '../src/models/enrollment.model.js';
import { PaymentModel } from '../src/models/payment.model.js';
import { getPaymentProvider } from '../src/payments/index.js';
import type { MockPaymentProvider } from '../src/payments/mock.provider.js';
import { api, createCourse, createUser, flushBackgroundTasks, login, mailer, useTestDatabase } from './helpers.js';

useTestDatabase();

const mock = () => getPaymentProvider() as MockPaymentProvider;

async function signedInLearner(options: { verified?: boolean } = {}) {
  const user = await createUser({ email: `learner${Math.random().toString(36).slice(2, 7)}@example.com`, verified: options.verified });
  const { accessToken } = await login(user.email);
  return { user, auth: { Authorization: `Bearer ${accessToken}` } };
}

async function startCheckout(price = 499) {
  const learner = await signedInLearner();
  const course = await createCourse({ price });
  const checkout = await api().post(`/api/v1/courses/${course._id}/checkout`).set(learner.auth).send({ amount: 1 }).expect(200);
  return { ...learner, course, order: checkout.body };
}

describe('checkout', () => {
  it('should take the amount from the database, never from the request', async () => {
    const { order, course } = await startCheckout(1299);
    expect(order).toMatchObject({ type: 'order', provider: 'mock', amount: 1299 * 100, currency: 'INR' });
    const stored = await PaymentModel.findOne({ orderId: order.orderId });
    expect(stored).toMatchObject({ amount: 129900, status: 'created' });
    expect(stored?.course.toString()).toBe(course._id.toString());
  });

  it('should reuse a pending order instead of creating a new one', async () => {
    const { auth, course, order } = await startCheckout();
    const again = await api().post(`/api/v1/courses/${course._id}/checkout`).set(auth).expect(200);
    expect(again.body.orderId).toBe(order.orderId);
    expect(await PaymentModel.countDocuments()).toBe(1);
  });

  it('should enrol directly in a free course and send the enrolment email', async () => {
    const { user, auth } = await signedInLearner();
    const course = await createCourse({ price: 0 });
    const response = await api().post(`/api/v1/courses/${course._id}/checkout`).set(auth).expect(201);
    expect(response.body).toEqual({ type: 'enrolled', courseId: course._id.toString() });
    await flushBackgroundTasks();
    expect(mailer.lastTo(user.email)?.subject).toContain('You are enrolled');
    expect(await PaymentModel.countDocuments()).toBe(0);
  });

  it('should require a verified email', async () => {
    const { auth } = await signedInLearner({ verified: false });
    const course = await createCourse();
    const response = await api().post(`/api/v1/courses/${course._id}/checkout`).set(auth).expect(403);
    expect(response.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('should refuse an unpublished course and a second enrolment', async () => {
    const { auth } = await signedInLearner();
    const draft = await createCourse({ isPublished: false });
    await api().post(`/api/v1/courses/${draft._id}/checkout`).set(auth).expect(404);
    const free = await createCourse({ price: 0 });
    await api().post(`/api/v1/courses/${free._id}/checkout`).set(auth).expect(201);
    const second = await api().post(`/api/v1/courses/${free._id}/checkout`).set(auth).expect(409);
    expect(second.body.error.code).toBe('ALREADY_ENROLLED');
  });
});

describe('payment verification', () => {
  it('should enrol after a valid signature and record the payment', async () => {
    const { auth, order, course, user } = await startCheckout();
    const callback = (await api().post(`/api/v1/payments/mock/${order.orderId}/pay`).set(auth).expect(200)).body;
    const verified = await api().post('/api/v1/payments/verify').set(auth).send(callback).expect(200);
    expect(verified.body).toEqual({ courseId: course._id.toString(), alreadyProcessed: false });

    const payment = await PaymentModel.findOne({ orderId: order.orderId });
    expect(payment).toMatchObject({ status: 'paid', paymentId: callback.paymentId, provider: 'mock' });
    expect(await EnrollmentModel.countDocuments({ user: user._id, course: course._id })).toBe(1);
    await flushBackgroundTasks();
    expect(mailer.lastTo(user.email)?.text).toContain('₹499');

    const dashboard = await api().get('/api/v1/me/enrollments').set(auth).expect(200);
    expect(dashboard.body.items[0].course.id).toBe(course._id.toString());
  });

  it('should reject an invalid signature', async () => {
    const { auth, order } = await startCheckout();
    const callback = mock().simulatePayment(order.orderId);
    const response = await api().post('/api/v1/payments/verify').set(auth).send({ ...callback, signature: 'a'.repeat(64) }).expect(400);
    expect(response.body.error.code).toBe('PAYMENT_SIGNATURE_INVALID');
    expect(await EnrollmentModel.countDocuments()).toBe(0);
  });

  it('should reject a signature computed for another payment id (tampered callback)', async () => {
    const { auth, order } = await startCheckout();
    const callback = mock().simulatePayment(order.orderId);
    const other = mock().simulatePayment(order.orderId);
    await api().post('/api/v1/payments/verify').set(auth).send({ ...callback, signature: other.signature }).expect(400);
    expect(await EnrollmentModel.countDocuments()).toBe(0);
  });

  it('should reject a payment whose amount differs from the order (tampered amount)', async () => {
    const { auth, order } = await startCheckout(2499);
    const callback = mock().simulatePayment(order.orderId, { amount: 100 });
    const response = await api().post('/api/v1/payments/verify').set(auth).send(callback).expect(400);
    expect(response.body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    expect((await PaymentModel.findOne({ orderId: order.orderId }))?.status).toBe('failed');
    expect(await EnrollmentModel.countDocuments()).toBe(0);
  });

  it('should capture an authorized payment for the database amount before enrolling', async () => {
    const { auth, order } = await startCheckout(799);
    const capture = vi.spyOn(mock(), 'capturePayment');
    const callback = mock().simulatePayment(order.orderId, { status: 'authorized' });
    await api().post('/api/v1/payments/verify').set(auth).send(callback).expect(200);
    expect(capture).toHaveBeenCalledWith(callback.paymentId, 79900);
    expect(await EnrollmentModel.countDocuments()).toBe(1);
    capture.mockRestore();
  });

  it('should reject an authorized payment that could not be captured', async () => {
    const { auth, order } = await startCheckout();
    const callback = mock().simulatePayment(order.orderId, { status: 'authorized' });
    const capture = vi.spyOn(mock(), 'capturePayment').mockResolvedValue({ paymentId: callback.paymentId, orderId: order.orderId, amount: order.amount, status: 'authorized' });
    const response = await api().post('/api/v1/payments/verify').set(auth).send(callback).expect(400);
    expect(response.body.error.code).toBe('PAYMENT_NOT_CAPTURED');
    expect((await PaymentModel.findOne({ orderId: order.orderId }))?.status).toBe('created');
    expect(await EnrollmentModel.countDocuments()).toBe(0);
    capture.mockRestore();
  });

  it('should treat a replay of the same callback as idempotent', async () => {
    const { auth, order, user } = await startCheckout();
    const callback = mock().simulatePayment(order.orderId);
    await api().post('/api/v1/payments/verify').set(auth).send(callback).expect(200);
    const replay = await api().post('/api/v1/payments/verify').set(auth).send(callback).expect(200);
    expect(replay.body.alreadyProcessed).toBe(true);
    expect(await EnrollmentModel.countDocuments({ user: user._id })).toBe(1);
    await flushBackgroundTasks();
    expect(mailer.messages.filter((message) => message.to === user.email && message.subject.includes('enrolled'))).toHaveLength(1);
  });

  it('should reject a second, different payment id on an order that is already paid', async () => {
    const { auth, order } = await startCheckout();
    const first = mock().simulatePayment(order.orderId);
    await api().post('/api/v1/payments/verify').set(auth).send(first).expect(200);
    const second = mock().simulatePayment(order.orderId);
    const response = await api().post('/api/v1/payments/verify').set(auth).send(second).expect(409);
    expect(response.body.error.code).toBe('PAYMENT_ALREADY_PROCESSED');
    expect((await PaymentModel.findOne({ orderId: order.orderId }))?.paymentId).toBe(first.paymentId);
  });

  it('should enrol exactly once when the same callback is verified concurrently', async () => {
    const { auth, order, user } = await startCheckout();
    const callback = mock().simulatePayment(order.orderId);
    const responses = await Promise.all(Array.from({ length: 5 }, () => api().post('/api/v1/payments/verify').set(auth).send(callback)));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(await EnrollmentModel.countDocuments({ user: user._id })).toBe(1);
  });

  it("should not let a user verify someone else's order", async () => {
    const { order } = await startCheckout();
    const intruder = await signedInLearner();
    const callback = mock().simulatePayment(order.orderId);
    await api().post('/api/v1/payments/verify').set(intruder.auth).send(callback).expect(404);
    await api().post(`/api/v1/payments/mock/${order.orderId}/pay`).set(intruder.auth).expect(404);
  });
});
