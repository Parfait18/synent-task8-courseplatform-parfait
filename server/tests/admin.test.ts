import { describe, expect, it } from 'vitest';
import { UserModel } from '../src/models/user.model.js';
import { api, createCourse, createUser, login, useTestDatabase } from './helpers.js';

useTestDatabase();

async function adminAuth() {
  const admin = await createUser({ email: 'admin@example.com', role: 'admin' });
  const { accessToken } = await login(admin.email);
  return { admin, auth: { Authorization: `Bearer ${accessToken}` } };
}

const courseBody = {
  title: 'Accessible forms',
  summary: 'Build forms everyone can fill in.',
  description: 'Labels, errors, focus order and testing with a screen reader.',
  category: 'design',
  level: 'intermediate',
  price: 899,
  instructor: 'Riya Desai',
};

describe('RBAC', () => {
  it('should return 401 without a token and 403 for a learner on every admin route', async () => {
    await api().get('/api/v1/admin/stats').expect(401);
    const user = await createUser({ email: 'learner@example.com' });
    const { accessToken } = await login(user.email);
    const auth = { Authorization: `Bearer ${accessToken}` };
    for (const [method, path] of [
      ['get', '/api/v1/admin/stats'],
      ['get', '/api/v1/admin/courses'],
      ['post', '/api/v1/admin/courses'],
      ['get', '/api/v1/admin/users'],
      ['get', '/api/v1/admin/enrollments'],
      ['get', '/api/v1/admin/payments'],
    ] as const) {
      const response = await api()[method](path).set(auth).send(courseBody);
      expect(response.status, `${method} ${path}`).toBe(403);
      expect(response.body.error.code).toBe('ROLE_REQUIRED');
    }
  });

  it('should re-check the role in the database, so a demoted admin is refused at once', async () => {
    const { admin, auth } = await adminAuth();
    await api().get('/api/v1/admin/stats').set(auth).expect(200);
    await UserModel.updateOne({ _id: admin._id }, { role: 'user' });
    await api().get('/api/v1/admin/stats').set(auth).expect(403);
  });

  it('should reject a forged token', async () => {
    await api().get('/api/v1/admin/stats').set('Authorization', 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIn0.').expect(401);
  });
});

describe('admin content management', () => {
  it('should create a draft, add modules and lessons, reorder, publish and delete', async () => {
    const { auth } = await adminAuth();
    const created = (await api().post('/api/v1/admin/courses').set(auth).send(courseBody).expect(201)).body.course;
    expect(created).toMatchObject({ slug: 'accessible-forms', isPublished: false });

    const empty = await api().patch(`/api/v1/admin/courses/${created.id}/publication`).set(auth).send({ isPublished: true }).expect(400);
    expect(empty.body.error.code).toBe('COURSE_EMPTY');

    let course = (await api().post(`/api/v1/admin/courses/${created.id}/modules`).set(auth).send({ title: 'Labels' }).expect(201)).body.course;
    course = (await api().post(`/api/v1/admin/courses/${created.id}/modules`).set(auth).send({ title: 'Errors' }).expect(201)).body.course;
    const [first, second] = course.modules;
    course = (await api().post(`/api/v1/admin/courses/${created.id}/modules/${first.id}/lessons`).set(auth).send({ title: 'Why labels', videoUrl: 'https://example.com/a.mp4', durationMinutes: 6, isFreePreview: true }).expect(201)).body.course;
    course = (await api().post(`/api/v1/admin/courses/${created.id}/modules/${first.id}/lessons`).set(auth).send({ title: 'Grouping', videoUrl: 'https://example.com/b.mp4', durationMinutes: 4 }).expect(201)).body.course;

    await api().post(`/api/v1/admin/courses/${created.id}/modules/${first.id}/lessons`).set(auth).send({ title: 'Bad', videoUrl: 'javascript:alert(1)', durationMinutes: 4 }).expect(400);

    course = (await api().put(`/api/v1/admin/courses/${created.id}/modules/order`).set(auth).send({ ids: [second.id, first.id] }).expect(200)).body.course;
    expect(course.modules.map((m: { title: string }) => m.title)).toEqual(['Errors', 'Labels']);
    await api().put(`/api/v1/admin/courses/${created.id}/modules/order`).set(auth).send({ ids: [second.id] }).expect(400);

    const lessons = course.modules[1].lessons;
    course = (await api().put(`/api/v1/admin/courses/${created.id}/modules/${first.id}/lessons/order`).set(auth).send({ ids: [lessons[1].id, lessons[0].id] }).expect(200)).body.course;
    expect(course.modules[1].lessons[0].title).toBe('Grouping');
    course = (await api().patch(`/api/v1/admin/courses/${created.id}/modules/${first.id}/lessons/${lessons[0].id}`).set(auth).send({ title: 'Why labels matter' }).expect(200)).body.course;
    expect(course.modules[1].lessons[1].title).toBe('Why labels matter');

    const updated = (await api().patch(`/api/v1/admin/courses/${created.id}`).set(auth).send({ title: 'Accessible web forms', price: 0 }).expect(200)).body.course;
    expect(updated).toMatchObject({ title: 'Accessible web forms', price: 0, slug: 'accessible-forms' });

    await api().patch(`/api/v1/admin/courses/${created.id}/publication`).set(auth).send({ isPublished: true }).expect(200);
    expect((await api().get('/api/v1/courses/accessible-forms').expect(200)).body.course.title).toBe('Accessible web forms');

    await api().delete(`/api/v1/admin/courses/${created.id}/modules/${second.id}`).set(auth).expect(200);
    await api().delete(`/api/v1/admin/courses/${created.id}`).set(auth).expect(204);
    await api().get(`/api/v1/admin/courses/${created.id}`).set(auth).expect(404);
  });

  it('should refuse to delete a course with enrolments', async () => {
    const { auth } = await adminAuth();
    const course = await createCourse({ price: 0 });
    const learner = await createUser({ email: 'l@example.com' });
    const session = await login(learner.email);
    await api().post(`/api/v1/courses/${course._id}/checkout`).set('Authorization', `Bearer ${session.accessToken}`).expect(201);
    const response = await api().delete(`/api/v1/admin/courses/${course._id}`).set(auth).expect(409);
    expect(response.body.error.code).toBe('COURSE_HAS_ENROLLMENTS');

    const stats = (await api().get('/api/v1/admin/stats').set(auth).expect(200)).body;
    expect(stats).toMatchObject({ users: 1, enrollments: 1, publishedCourses: 1 });
    const users = (await api().get('/api/v1/admin/users?search=l@example').set(auth).expect(200)).body;
    expect(users.items[0]).toMatchObject({ email: 'l@example.com', enrollmentCount: 1 });
    const detail = (await api().get(`/api/v1/admin/users/${learner._id}`).set(auth).expect(200)).body;
    expect(detail.enrollments[0].course.id).toBe(course._id.toString());
    const enrollments = (await api().get(`/api/v1/admin/enrollments?course=${course._id}`).set(auth).expect(200)).body;
    expect(enrollments.total).toBe(1);
    expect((await api().get('/api/v1/admin/payments?status=paid').set(auth).expect(200)).body.total).toBe(0);
  });
});
