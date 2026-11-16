import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { flushBackgroundTasks } from '../src/lib/background.js';
import { MemoryMailer } from '../src/mail/memory.mailer.js';
import { setMailer } from '../src/mail/index.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';
import { CourseModel } from '../src/models/course.model.js';
import { UserModel, type UserRole } from '../src/models/user.model.js';

export const mailer = new MemoryMailer();
setMailer(mailer);
export const app = createApp();
export const api = () => request(app);

/** Connects to the test database and empties it between tests. Refuses any non-test database. */
export function useTestDatabase() {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    const name = mongoose.connection.db?.databaseName ?? '';
    if (!name.endsWith('_test')) throw new Error(`Refusing to run tests against database "${name}"`);
    await mongoose.connection.db!.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
  });
  beforeEach(async () => {
    await flushBackgroundTasks();
    mailer.clear();
    await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
  });
  afterAll(async () => {
    await flushBackgroundTasks();
    await mongoose.disconnect();
  });
}

export const PASSWORD = 'correct-horse-42';

export async function createUser(overrides: { email?: string; role?: UserRole; verified?: boolean; name?: string } = {}) {
  return UserModel.create({
    name: overrides.name ?? 'Asha Learner',
    email: overrides.email ?? `user${Math.random().toString(36).slice(2, 8)}@example.com`,
    passwordHash: await hashPassword(PASSWORD),
    role: overrides.role ?? 'user',
    emailVerifiedAt: overrides.verified === false ? null : new Date(),
  });
}

/** Reads the `kalam_rt` cookie (full Set-Cookie line) from a response. */
export function refreshSetCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const values = Array.isArray(header) ? (header as string[]) : typeof header === 'string' ? [header] : [];
  const cookie = values.find((value) => value.startsWith('kalam_rt='));
  if (!cookie) throw new Error('No refresh cookie in the response');
  return cookie;
}

/** Logs in through the API and returns the access token and the refresh cookie. */
export async function login(email: string, password = PASSWORD) {
  const response = await api().post('/api/v1/auth/login').send({ email, password }).expect(200);
  return { accessToken: response.body.accessToken as string, cookie: refreshSetCookie(response).split(';')[0]!, body: response.body };
}

export async function createCourse(overrides: Partial<{ title: string; price: number; isPublished: boolean; slug: string }> = {}) {
  const title = overrides.title ?? 'Practical TypeScript';
  return CourseModel.create({
    title,
    slug: overrides.slug ?? `${title.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
    summary: 'A short summary.',
    description: 'A longer description of the course.',
    category: 'development',
    level: 'beginner',
    price: overrides.price ?? 499,
    instructor: 'Meera Rao',
    isPublished: overrides.isPublished ?? true,
    modules: [
      { title: 'Basics', lessons: [{ title: 'Intro', videoUrl: 'https://example.com/a.mp4', durationMinutes: 5, isFreePreview: true }, { title: 'Types', videoUrl: 'https://example.com/b.mp4', durationMinutes: 8 }] },
      { title: 'Next steps', lessons: [{ title: 'Generics', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', durationMinutes: 12 }, { title: 'Wrap-up', videoUrl: 'https://example.com/d.mp4', durationMinutes: 3 }] },
    ],
  });
}

export { flushBackgroundTasks };

/** Extracts the `token` query parameter from the first link of the last email sent to `email`. */
export function tokenFromLastEmail(email: string): string {
  const link = mailer.lastTo(email)?.links?.[0];
  if (!link) throw new Error(`No email with a link for ${email}`);
  return new URL(link).searchParams.get('token')!;
}
