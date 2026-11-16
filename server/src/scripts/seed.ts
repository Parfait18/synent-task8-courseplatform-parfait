/**
 * Seeds the `synent_courses` database with demo accounts and courses.
 * Idempotent: running it again resets the demo data. It refuses to touch any other database.
 *
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../lib/db.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { CourseModel } from '../models/course.model.js';
import { EnrollmentModel } from '../models/enrollment.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { TokenModel } from '../models/token.model.js';
import { UserModel } from '../models/user.model.js';
import { seedCourses } from './seed-data.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy server/.env.example to server/.env first.`);
  return value;
}

async function main() {
  await connectDatabase(env.MONGODB_URI);
  const database = mongoose.connection.db?.databaseName ?? '';
  if (!database.startsWith('synent_courses')) throw new Error(`Refusing to seed database "${database}"`);

  const admin = { name: 'Kalam Admin', email: required('SEED_ADMIN_EMAIL'), password: required('SEED_ADMIN_PASSWORD') };
  const learner = { name: 'Priya Sharma', email: required('SEED_USER_EMAIL'), password: required('SEED_USER_PASSWORD') };

  // Reset demo data only: demo users, their tokens, enrolments and payments, and the seeded courses.
  const demoUsers = await UserModel.find({ email: { $in: [admin.email, learner.email] } }).select('_id');
  const demoUserIds = demoUsers.map((user) => user._id);
  const seededCourses = await CourseModel.find({ slug: { $in: seedCourses.map((course) => course.slug) } }).select('_id');
  const seededCourseIds = seededCourses.map((course) => course._id);
  await Promise.all([
    TokenModel.deleteMany({ user: { $in: demoUserIds } }),
    EnrollmentModel.deleteMany({ $or: [{ user: { $in: demoUserIds } }, { course: { $in: seededCourseIds } }] }),
    PaymentModel.deleteMany({ $or: [{ user: { $in: demoUserIds } }, { course: { $in: seededCourseIds } }] }),
  ]);
  await Promise.all([UserModel.deleteMany({ _id: { $in: demoUserIds } }), CourseModel.deleteMany({ _id: { $in: seededCourseIds } })]);
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));

  const now = new Date();
  const [adminUser, learnerUser] = await UserModel.create([
    { name: admin.name, email: admin.email, passwordHash: await hashPassword(admin.password), role: 'admin', emailVerifiedAt: now },
    { name: learner.name, email: learner.email, passwordHash: await hashPassword(learner.password), role: 'user', emailVerifiedAt: now },
  ]);

  // Stagger creation dates so "newest" sorting is meaningful.
  const courses = await CourseModel.create(
    seedCourses.map((course, index) => ({ ...course, createdAt: new Date(now.getTime() - (seedCourses.length - index) * 86_400_000) })),
  );
  const bySlug = new Map(courses.map((course) => [course.slug, course]));

  // The learner already follows a free course (half done) and a paid one (paid with the mock provider).
  const design = bySlug.get('interface-design-fundamentals')!;
  const designLessons = design.modules.flatMap((module) => module.lessons.map((lesson) => lesson._id));
  const sql = bySlug.get('sql-you-can-trust')!;
  const payment = await PaymentModel.create({
    user: learnerUser!._id,
    course: sql._id,
    provider: 'mock',
    orderId: 'mock_order_seed0001',
    paymentId: 'mock_pay_seed0001',
    amount: sql.price * 100,
    currency: 'INR',
    status: 'paid',
    paidAt: new Date(now.getTime() - 2 * 86_400_000),
  });
  await EnrollmentModel.create([
    { user: learnerUser!._id, course: design._id, completedLessons: designLessons.slice(0, 2), lastLesson: designLessons[1] },
    { user: learnerUser!._id, course: sql._id, payment: payment._id, completedLessons: [], lastLesson: null },
  ]);

  console.log(`Seeded ${courses.length} courses in "${database}".`);
  console.log(`Admin:   ${adminUser!.email}`);
  console.log(`Learner: ${learnerUser!.email}`);
  console.log('Passwords: see SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD in server/.env');
  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectDatabase();
  process.exit(1);
});
