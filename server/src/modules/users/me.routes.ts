import { Router } from 'express';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';
import { authController } from '../auth/auth.controller.js';
import { enrollmentController } from '../enrollments/enrollment.controller.js';

export const meRouter = Router();
meRouter.use(authenticate);
meRouter.get('/', authController.me);
meRouter.get('/enrollments', validate({ query: paginationQuerySchema }), enrollmentController.mine);
