import { Router, type Request, type Response } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/require-role.js';
import { input, validate } from '../../middlewares/validate.js';
import * as s from './admin.schemas.js';
import { adminService } from './admin.service.js';

type CourseP = { id: string };
type ModuleP = CourseP & { moduleId: string };
type LessonP = ModuleP & { lessonId: string };

/** Thin controller: parse validated input, call the service, send JSON. */
const c = {
  stats: async (_req: Request, res: Response) => res.json(await adminService.stats()),
  listCourses: async (req: Request, res: Response) => res.json(await adminService.listCourses(input.query(req))),
  getCourse: async (req: Request, res: Response) => res.json({ course: await adminService.getCourse(input.params<CourseP>(req).id) }),
  createCourse: async (req: Request, res: Response) => res.status(201).json({ course: await adminService.createCourse(input.body(req)) }),
  updateCourse: async (req: Request, res: Response) => res.json({ course: await adminService.updateCourse(input.params<CourseP>(req).id, input.body(req)) }),
  deleteCourse: async (req: Request, res: Response) => {
    await adminService.deleteCourse(input.params<CourseP>(req).id);
    res.status(204).end();
  },
  publication: async (req: Request, res: Response) =>
    res.json({ course: await adminService.setPublication(input.params<CourseP>(req).id, input.body<{ isPublished: boolean }>(req).isPublished) }),
  addModule: async (req: Request, res: Response) =>
    res.status(201).json({ course: await adminService.addModule(input.params<CourseP>(req).id, input.body<{ title: string }>(req).title) }),
  updateModule: async (req: Request, res: Response) => {
    const p = input.params<ModuleP>(req);
    res.json({ course: await adminService.updateModule(p.id, p.moduleId, input.body<{ title: string }>(req).title) });
  },
  deleteModule: async (req: Request, res: Response) => {
    const p = input.params<ModuleP>(req);
    res.json({ course: await adminService.deleteModule(p.id, p.moduleId) });
  },
  reorderModules: async (req: Request, res: Response) =>
    res.json({ course: await adminService.reorderModules(input.params<CourseP>(req).id, input.body<{ ids: string[] }>(req).ids) }),
  addLesson: async (req: Request, res: Response) => {
    const p = input.params<ModuleP>(req);
    res.status(201).json({ course: await adminService.addLesson(p.id, p.moduleId, input.body(req)) });
  },
  updateLesson: async (req: Request, res: Response) => {
    const p = input.params<LessonP>(req);
    res.json({ course: await adminService.updateLesson(p.id, p.moduleId, p.lessonId, input.body(req)) });
  },
  deleteLesson: async (req: Request, res: Response) => {
    const p = input.params<LessonP>(req);
    res.json({ course: await adminService.deleteLesson(p.id, p.moduleId, p.lessonId) });
  },
  reorderLessons: async (req: Request, res: Response) => {
    const p = input.params<ModuleP>(req);
    res.json({ course: await adminService.reorderLessons(p.id, p.moduleId, input.body<{ ids: string[] }>(req).ids) });
  },
  listUsers: async (req: Request, res: Response) => res.json(await adminService.listUsers(input.query(req))),
  getUser: async (req: Request, res: Response) => res.json(await adminService.getUser(input.params<CourseP>(req).id)),
  listEnrollments: async (req: Request, res: Response) => res.json(await adminService.listEnrollments(input.query(req))),
  listPayments: async (req: Request, res: Response) => res.json(await adminService.listPayments(input.query(req))),
};

export const adminRouter = Router();
// Every admin route: a valid access token, then the admin role read from the database.
adminRouter.use(authenticate, requireRole('admin'));

adminRouter.get('/stats', c.stats);

adminRouter.get('/courses', validate({ query: s.adminCoursesQuery }), c.listCourses);
adminRouter.post('/courses', validate({ body: s.courseBodySchema }), c.createCourse);
adminRouter.get('/courses/:id', validate({ params: s.courseParams }), c.getCourse);
adminRouter.patch('/courses/:id', validate({ params: s.courseParams, body: s.courseUpdateSchema }), c.updateCourse);
adminRouter.delete('/courses/:id', validate({ params: s.courseParams }), c.deleteCourse);
adminRouter.patch('/courses/:id/publication', validate({ params: s.courseParams, body: s.publicationSchema }), c.publication);

adminRouter.post('/courses/:id/modules', validate({ params: s.courseParams, body: s.moduleBodySchema }), c.addModule);
adminRouter.put('/courses/:id/modules/order', validate({ params: s.courseParams, body: s.orderSchema }), c.reorderModules);
adminRouter.patch('/courses/:id/modules/:moduleId', validate({ params: s.moduleParams, body: s.moduleBodySchema }), c.updateModule);
adminRouter.delete('/courses/:id/modules/:moduleId', validate({ params: s.moduleParams }), c.deleteModule);

adminRouter.post('/courses/:id/modules/:moduleId/lessons', validate({ params: s.moduleParams, body: s.lessonBodySchema }), c.addLesson);
adminRouter.put('/courses/:id/modules/:moduleId/lessons/order', validate({ params: s.moduleParams, body: s.orderSchema }), c.reorderLessons);
adminRouter.patch('/courses/:id/modules/:moduleId/lessons/:lessonId', validate({ params: s.lessonParams, body: s.lessonUpdateSchema }), c.updateLesson);
adminRouter.delete('/courses/:id/modules/:moduleId/lessons/:lessonId', validate({ params: s.lessonParams }), c.deleteLesson);

adminRouter.get('/users', validate({ query: s.adminUsersQuery }), c.listUsers);
adminRouter.get('/users/:id', validate({ params: s.idParams }), c.getUser);
adminRouter.get('/enrollments', validate({ query: s.adminEnrollmentsQuery }), c.listEnrollments);
adminRouter.get('/payments', validate({ query: s.adminPaymentsQuery }), c.listPayments);
