import type { Types } from 'mongoose';
import { AppError } from '../../lib/app-error.js';
import { toPaginated, type PaginationQuery } from '../../lib/pagination.js';
import { slugify } from '../../lib/strings.js';
import type { Course, CourseDocument } from '../../models/course.model.js';
import type { PaymentStatus } from '../../models/payment.model.js';
import { presentCourseFull } from '../courses/course.presenter.js';
import { courseRepository } from '../courses/course.repository.js';
import { enrollmentRepository } from '../enrollments/enrollment.repository.js';
import { computeProgress } from '../learning/progress.js';
import { paymentRepository } from '../payments/payment.repository.js';
import { presentUser } from '../users/user.presenter.js';
import { userRepository } from '../users/user.repository.js';
import type { CourseBody, LessonBody } from './admin.schemas.js';

type Ref = { _id: Types.ObjectId; name?: string; email?: string; title?: string; slug?: string } | null;
const ref = (value: unknown) => (value && typeof value === 'object' ? (value as Ref) : null);

async function loadCourse(id: string): Promise<CourseDocument> {
  const course = await courseRepository.findDocumentById(id);
  if (!course) throw AppError.notFound('COURSE_NOT_FOUND', 'This course does not exist.');
  return course;
}

function findModule(course: CourseDocument, moduleId: string) {
  const module = course.modules.id(moduleId);
  if (!module) throw AppError.notFound('MODULE_NOT_FOUND', 'This module does not exist.');
  return module;
}

/** Reorders `items` to follow `ids`, which must be an exact permutation of the current ids. */
function reorder<T extends { _id: Types.ObjectId }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((item) => [item._id.toString(), item]));
  if (ids.length !== items.length || new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id))) {
    throw AppError.badRequest('INVALID_ORDER', 'The new order must list every item exactly once.');
  }
  return ids.map((id) => byId.get(id)!);
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || 'course';
  let slug = base;
  for (let suffix = 2; await courseRepository.slugExists(slug); suffix += 1) slug = `${base}-${suffix}`;
  return slug;
}

const present = (course: CourseDocument) => presentCourseFull(course.toObject() as Course);

export const adminService = {
  async stats() {
    const [users, enrollments, revenue, publishedCourses, recent] = await Promise.all([
      userRepository.count(),
      enrollmentRepository.count(),
      paymentRepository.totalRevenue(),
      courseRepository.countPublished(),
      paymentRepository.recentPaid(5),
    ]);
    return {
      users,
      enrollments,
      revenue: { amount: revenue, currency: 'INR' as const },
      publishedCourses,
      recentPayments: recent.map((payment) => ({
        id: payment._id.toString(),
        amount: payment.amount,
        paidAt: payment.paidAt?.toISOString() ?? null,
        user: ref(payment.user) ? { name: ref(payment.user)!.name, email: ref(payment.user)!.email } : null,
        course: ref(payment.course) ? { title: ref(payment.course)!.title } : null,
      })),
    };
  },

  // Courses ------------------------------------------------------------------

  async listCourses(query: PaginationQuery & { search?: string; status?: 'published' | 'draft' }) {
    const { items, total } = await courseRepository.searchAll(query);
    const counts = await enrollmentRepository.countBy('course', items.map((course) => course._id));
    const rows = items.map((course) => ({ ...presentCourseFull(course), modules: undefined, enrollmentCount: counts.get(course._id.toString()) ?? 0 }));
    return toPaginated(rows, total, query);
  },

  async getCourse(id: string) {
    return present(await loadCourse(id));
  },

  async createCourse(body: CourseBody) {
    const course = await courseRepository.create({ ...body, slug: await uniqueSlug(body.title), isPublished: false, modules: [] });
    return presentCourseFull(course.toObject() as Course);
  },

  async updateCourse(id: string, body: Partial<CourseBody>) {
    const course = await loadCourse(id);
    // The slug stays stable when the title changes, so shared links keep working.
    course.set(body);
    await course.save();
    return present(course);
  },

  async setPublication(id: string, isPublished: boolean) {
    const course = await loadCourse(id);
    if (isPublished && !course.modules.some((module) => module.lessons.length > 0)) {
      throw AppError.badRequest('COURSE_EMPTY', 'Add at least one lesson before publishing.');
    }
    course.isPublished = isPublished;
    await course.save();
    return present(course);
  },

  async deleteCourse(id: string) {
    await loadCourse(id);
    if ((await enrollmentRepository.countForCourse(id)) > 0) {
      throw AppError.conflict('COURSE_HAS_ENROLLMENTS', 'Learners are enrolled in this course. Unpublish it instead of deleting it.');
    }
    await courseRepository.deleteById(id);
  },

  // Modules and lessons -----------------------------------------------------

  async addModule(id: string, title: string) {
    const course = await loadCourse(id);
    course.modules.push({ title, lessons: [] });
    await course.save();
    return present(course);
  },

  async updateModule(id: string, moduleId: string, title: string) {
    const course = await loadCourse(id);
    findModule(course, moduleId).title = title;
    await course.save();
    return present(course);
  },

  async deleteModule(id: string, moduleId: string) {
    const course = await loadCourse(id);
    findModule(course, moduleId).deleteOne();
    await course.save();
    return present(course);
  },

  async reorderModules(id: string, ids: string[]) {
    const course = await loadCourse(id);
    course.set('modules', reorder(course.modules, ids).map((module) => module.toObject()));
    await course.save();
    return present(course);
  },

  async addLesson(id: string, moduleId: string, body: LessonBody) {
    const course = await loadCourse(id);
    findModule(course, moduleId).lessons.push(body);
    await course.save();
    return present(course);
  },

  async updateLesson(id: string, moduleId: string, lessonId: string, body: Partial<LessonBody>) {
    const course = await loadCourse(id);
    const lesson = findModule(course, moduleId).lessons.id(lessonId);
    if (!lesson) throw AppError.notFound('LESSON_NOT_FOUND', 'This lesson does not exist.');
    lesson.set(body);
    await course.save();
    return present(course);
  },

  async deleteLesson(id: string, moduleId: string, lessonId: string) {
    const course = await loadCourse(id);
    const lesson = findModule(course, moduleId).lessons.id(lessonId);
    if (!lesson) throw AppError.notFound('LESSON_NOT_FOUND', 'This lesson does not exist.');
    lesson.deleteOne();
    await course.save();
    return present(course);
  },

  async reorderLessons(id: string, moduleId: string, ids: string[]) {
    const course = await loadCourse(id);
    const module = findModule(course, moduleId);
    module.set('lessons', reorder(module.lessons, ids).map((lesson) => lesson.toObject()));
    await course.save();
    return present(course);
  },

  // Users, enrolments, payments ---------------------------------------------

  async listUsers(query: PaginationQuery & { search?: string }) {
    const { items, total } = await userRepository.search(query);
    const counts = await enrollmentRepository.countBy('user', items.map((user) => user._id));
    return toPaginated(items.map((user) => ({ ...presentUser(user), enrollmentCount: counts.get(user._id.toString()) ?? 0 })), total, query);
  },

  async getUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound('USER_NOT_FOUND', 'This user does not exist.');
    const enrollments = await enrollmentRepository.findAllForUser(user._id);
    return {
      user: presentUser(user),
      enrollments: enrollments.map((enrollment) => {
        const course = enrollment.course as unknown as Course | null;
        return {
          id: enrollment._id.toString(),
          enrolledAt: enrollment.createdAt.toISOString(),
          course: course ? { id: course._id.toString(), title: course.title, slug: course.slug } : null,
          progress: course ? computeProgress(course, enrollment.completedLessons).percent : 0,
        };
      }),
    };
  },

  async listEnrollments(query: PaginationQuery & { course?: string }) {
    const { items, total } = await enrollmentRepository.search(query);
    const rows = items.map((enrollment) => {
      const course = enrollment.course as unknown as Course | null;
      const user = ref(enrollment.user);
      const payment = enrollment.payment as unknown as { amount: number; status: PaymentStatus; provider: string } | null;
      return {
        id: enrollment._id.toString(),
        enrolledAt: enrollment.createdAt.toISOString(),
        user: user ? { id: user._id.toString(), name: user.name, email: user.email } : null,
        course: course ? { id: course._id.toString(), title: course.title } : null,
        progress: course ? computeProgress(course, enrollment.completedLessons).percent : 0,
        payment: payment ? { amount: payment.amount, status: payment.status, provider: payment.provider } : null,
      };
    });
    return toPaginated(rows, total, query);
  },

  async listPayments(query: PaginationQuery & { course?: string; status?: PaymentStatus }) {
    const { items, total } = await paymentRepository.search(query);
    const rows = items.map((payment) => {
      const user = ref(payment.user);
      const course = ref(payment.course);
      return {
        id: payment._id.toString(),
        orderId: payment.orderId,
        paymentId: payment.paymentId ?? null,
        provider: payment.provider,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
        paidAt: payment.paidAt?.toISOString() ?? null,
        user: user ? { id: user._id.toString(), name: user.name, email: user.email } : null,
        course: course ? { id: course._id.toString(), title: course.title } : null,
      };
    });
    return toPaginated(rows, total, query);
  },
};
