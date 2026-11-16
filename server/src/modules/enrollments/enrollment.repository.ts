import type { Types } from 'mongoose';
import { skipFor, type PaginationQuery } from '../../lib/pagination.js';
import { EnrollmentModel } from '../../models/enrollment.model.js';

type Id = string | Types.ObjectId;

export const enrollmentRepository = {
  findOne(user: Id, course: Id) {
    return EnrollmentModel.findOne({ user, course }).lean();
  },

  /**
   * Creates the enrolment if it does not exist. Relies on the unique (user, course) index,
   * so concurrent calls end with exactly one document. Returns whether it was created now.
   */
  async upsert(user: Id, course: Id, payment: Id | null): Promise<{ created: boolean }> {
    try {
      const result = await EnrollmentModel.updateOne(
        { user, course },
        { $setOnInsert: { payment, completedLessons: [], lastLesson: null } },
        { upsert: true },
      );
      return { created: result.upsertedCount === 1 };
    } catch (error) {
      // Duplicate key: a concurrent request created it first, which is the outcome we want.
      if ((error as { code?: number }).code === 11000) return { created: false };
      throw error;
    }
  },

  async findForUser(user: Id, page: PaginationQuery) {
    const [items, total] = await Promise.all([
      EnrollmentModel.find({ user }).sort({ updatedAt: -1 }).skip(skipFor(page)).limit(page.limit).populate('course').lean(),
      EnrollmentModel.countDocuments({ user }),
    ]);
    return { items, total };
  },

  findAllForUser(user: Id) {
    return EnrollmentModel.find({ user }).sort({ createdAt: -1 }).populate('course', 'title slug modules price').lean();
  },

  setLessonCompletion(user: Id, course: Id, lessonId: Id, isCompleted: boolean) {
    const update = isCompleted
      ? { $addToSet: { completedLessons: lessonId }, $set: { lastLesson: lessonId } }
      : { $pull: { completedLessons: lessonId }, $set: { lastLesson: lessonId } };
    return EnrollmentModel.findOneAndUpdate({ user, course }, update, { returnDocument: 'after' }).lean();
  },

  async search(query: PaginationQuery & { course?: string }) {
    const filter = query.course ? { course: query.course } : {};
    const [items, total] = await Promise.all([
      EnrollmentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipFor(query))
        .limit(query.limit)
        .populate('user', 'name email')
        .populate('course', 'title slug modules')
        .populate('payment', 'amount currency status provider')
        .lean(),
      EnrollmentModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  count() {
    return EnrollmentModel.countDocuments();
  },

  countForCourse(course: Id) {
    return EnrollmentModel.countDocuments({ course });
  },

  /** Enrolment counts for many users or courses in one query (avoids N+1 in admin lists). */
  async countBy(field: 'user' | 'course', ids: Types.ObjectId[]): Promise<Map<string, number>> {
    const rows = await EnrollmentModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { [field]: { $in: ids } } },
      { $group: { _id: '$' + field, count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  },
};
