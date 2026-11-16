import type { Types } from 'mongoose';
import { skipFor, type PaginationQuery } from '../../lib/pagination.js';
import { PaymentModel, type PaymentProviderName, type PaymentStatus } from '../../models/payment.model.js';

type Id = string | Types.ObjectId;

export const paymentRepository = {
  create(data: { user: Id; course: Id; provider: PaymentProviderName; orderId: string; amount: number }) {
    return PaymentModel.create({ ...data, currency: 'INR', status: 'created' });
  },

  findById(id: Id) {
    return PaymentModel.findById(id).lean();
  },

  findByOrderId(orderId: string) {
    return PaymentModel.findOne({ orderId }).lean();
  },

  /** A pending order for the same user, course, amount and provider can be reused. */
  findReusableOrder(user: Id, course: Id, amount: number, provider: PaymentProviderName) {
    return PaymentModel.findOne({ user, course, amount, provider, status: 'created' }).sort({ createdAt: -1 }).lean();
  },

  /** Transitions created → paid once; returns null when another request already did it. */
  markPaid(id: Id, paymentId: string) {
    return PaymentModel.findOneAndUpdate({ _id: id, status: 'created' }, { $set: { status: 'paid', paymentId, paidAt: new Date() } }, { returnDocument: 'after' }).lean();
  },

  markFailed(id: Id) {
    return PaymentModel.updateOne({ _id: id, status: 'created' }, { $set: { status: 'failed' } });
  },

  async search(query: PaginationQuery & { course?: string; status?: PaymentStatus }) {
    const filter: Record<string, unknown> = {};
    if (query.course) filter.course = query.course;
    if (query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      PaymentModel.find(filter).sort({ createdAt: -1 }).skip(skipFor(query)).limit(query.limit).populate('user', 'name email').populate('course', 'title slug').lean(),
      PaymentModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  async totalRevenue(): Promise<number> {
    const [row] = await PaymentModel.aggregate<{ total: number }>([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return row?.total ?? 0;
  },

  recentPaid(limit: number) {
    return PaymentModel.find({ status: 'paid' }).sort({ paidAt: -1 }).limit(limit).populate('user', 'name email').populate('course', 'title slug').lean();
  },
};
