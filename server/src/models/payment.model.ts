import { Schema, Types, model, type InferSchemaType } from 'mongoose';

export const PAYMENT_STATUSES = ['created', 'paid', 'failed'] as const;
export const PAYMENT_PROVIDERS = ['razorpay', 'mock'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

const paymentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: undefined, unique: true, sparse: true },
    /** Smallest currency unit (paise), copied from the course price when the order is created. */
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'created', index: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ status: 1, createdAt: -1 });

export type Payment = InferSchemaType<typeof paymentSchema> & { _id: Types.ObjectId; createdAt: Date };
export const PaymentModel = model('Payment', paymentSchema);
