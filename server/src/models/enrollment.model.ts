import { Schema, Types, model, type InferSchemaType } from 'mongoose';

const enrollmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    completedLessons: { type: [Schema.Types.ObjectId], default: [] },
    lastLesson: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

// One enrolment per user and course: the database guarantees idempotency.
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export type Enrollment = InferSchemaType<typeof enrollmentSchema> & { _id: Types.ObjectId; createdAt: Date };
export const EnrollmentModel = model('Enrollment', enrollmentSchema);
