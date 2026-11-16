import { describe, expect, it } from 'vitest';
import { EnrollmentModel } from '../src/models/enrollment.model.js';
import { api, createCourse, createUser, login, useTestDatabase } from './helpers.js';

useTestDatabase();

async function enrolledLearner() {
  const user = await createUser({ email: 'study@example.com' });
  const course = await createCourse({ price: 0 });
  const { accessToken } = await login(user.email);
  const auth = { Authorization: `Bearer ${accessToken}` };
  await api().post(`/api/v1/courses/${course._id}/checkout`).set(auth).expect(201);
  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson._id.toString()));
  return { user, course, auth, lessonIds };
}

describe('catalogue', () => {
  it('should list only published courses and filter by price, level and search', async () => {
    await createCourse({ title: 'Free Design', price: 0 });
    await createCourse({ title: 'Paid Python', price: 999 });
    await createCourse({ title: 'Hidden Draft', isPublished: false });

    const all = await api().get('/api/v1/courses').expect(200);
    expect(all.body.total).toBe(2);
    expect(all.body.items[0].modules).toBeUndefined();

    expect((await api().get('/api/v1/courses?price=free').expect(200)).body.items.map((c: { title: string }) => c.title)).toEqual(['Free Design']);
    expect((await api().get('/api/v1/courses?search=pyth').expect(200)).body.items[0].title).toBe('Paid Python');
    expect((await api().get('/api/v1/courses?search=(.*)').expect(200)).body.total).toBe(0);
    expect((await api().get('/api/v1/courses?level=advanced').expect(200)).body.total).toBe(0);
    await api().get('/api/v1/courses?category=cooking').expect(400);
    await api().get('/api/v1/courses?limit=500').expect(400);
  });

  it('should hide video URLs of paid lessons on the public course page', async () => {
    const course = await createCourse({ price: 999 });
    const detail = (await api().get(`/api/v1/courses/${course.slug}`).expect(200)).body.course;
    const lessons = detail.modules.flatMap((module: { lessons: { videoUrl: string | null; isFreePreview: boolean }[] }) => module.lessons);
    expect(lessons.filter((lesson: { isFreePreview: boolean }) => lesson.isFreePreview).every((lesson: { videoUrl: string | null }) => lesson.videoUrl)).toBe(true);
    expect(lessons.filter((lesson: { isFreePreview: boolean }) => !lesson.isFreePreview).every((lesson: { videoUrl: string | null }) => lesson.videoUrl === null)).toBe(true);
    expect(detail.isEnrolled).toBe(false);
  });
});

describe('learning', () => {
  it('should refuse the player to a user who is not enrolled', async () => {
    const course = await createCourse();
    const user = await createUser({ email: 'outsider@example.com' });
    const { accessToken } = await login(user.email);
    const response = await api().get(`/api/v1/learn/${course._id}`).set('Authorization', `Bearer ${accessToken}`).expect(403);
    expect(response.body.error.code).toBe('NOT_ENROLLED');
    await api().get(`/api/v1/learn/${course._id}`).expect(401);
  });

  it('should mark lessons complete and not complete and update progress', async () => {
    const { course, auth, lessonIds } = await enrolledLearner();
    const opened = await api().get(`/api/v1/learn/${course._id}`).set(auth).expect(200);
    expect(opened.body.progress.percent).toBe(0);
    expect(opened.body.course.modules[0].lessons[1].videoUrl).toBeTruthy();

    const path = (lessonId: string) => `/api/v1/learn/${course._id}/lessons/${lessonId}/completion`;
    expect((await api().put(path(lessonIds[0]!)).set(auth).expect(200)).body.progress.percent).toBe(25);
    // Completing twice does not count twice.
    expect((await api().put(path(lessonIds[0]!)).set(auth).expect(200)).body.progress.percent).toBe(25);
    expect((await api().put(path(lessonIds[1]!)).set(auth).expect(200)).body.progress).toMatchObject({ percent: 50, nextLessonId: lessonIds[2] });
    expect((await api().delete(path(lessonIds[0]!)).set(auth).expect(200)).body.progress.percent).toBe(25);

    const dashboard = await api().get('/api/v1/me/enrollments').set(auth).expect(200);
    expect(dashboard.body.items[0]).toMatchObject({ progress: { percent: 25 }, lastLessonId: lessonIds[0] });
    expect((await EnrollmentModel.findOne())?.completedLessons).toHaveLength(1);
  });

  it('should reject a lesson that belongs to another course', async () => {
    const { course, auth } = await enrolledLearner();
    const other = await createCourse({ title: 'Other' });
    const foreignLesson = other.modules[0]!.lessons[0]!._id.toString();
    await api().put(`/api/v1/learn/${course._id}/lessons/${foreignLesson}/completion`).set(auth).expect(404);
  });
});
