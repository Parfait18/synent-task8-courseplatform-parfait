import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { enrollmentController } from '../enrollments/enrollment.controller.js';
import { courseController } from './course.controller.js';
import { catalogQuerySchema, courseIdParamsSchema, slugParamsSchema } from './course.schemas.js';

export const courseRouter = Router();

courseRouter.get('/', validate({ query: catalogQuerySchema }), courseController.list);
courseRouter.get('/meta', courseController.meta);
courseRouter.get('/:slug', optionalAuthenticate, validate({ params: slugParamsSchema }), courseController.detail);
courseRouter.post('/:courseId/checkout', authenticate, validate({ params: courseIdParamsSchema }), enrollmentController.checkout);
