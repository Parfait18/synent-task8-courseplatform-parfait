import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate.js';
import { input, validate } from '../../middlewares/validate.js';
import { objectIdSchema } from '../courses/course.schemas.js';
import { learningService } from './learning.service.js';

const courseParams = z.object({ courseId: objectIdSchema });
const lessonParams = courseParams.extend({ lessonId: objectIdSchema });
type LessonParams = z.infer<typeof lessonParams>;

const learningController = {
  async course(req: Request, res: Response) {
    const { courseId } = input.params<{ courseId: string }>(req);
    res.json(await learningService.getCourse(req.auth!.userId, req.auth!.role, courseId));
  },
  async complete(req: Request, res: Response) {
    const { courseId, lessonId } = input.params<LessonParams>(req);
    res.json(await learningService.setLessonCompletion(req.auth!.userId, courseId, lessonId, true));
  },
  async uncomplete(req: Request, res: Response) {
    const { courseId, lessonId } = input.params<LessonParams>(req);
    res.json(await learningService.setLessonCompletion(req.auth!.userId, courseId, lessonId, false));
  },
};

export const learningRouter = Router();
learningRouter.use(authenticate);
learningRouter.get('/:courseId', validate({ params: courseParams }), learningController.course);
learningRouter.put('/:courseId/lessons/:lessonId/completion', validate({ params: lessonParams }), learningController.complete);
learningRouter.delete('/:courseId/lessons/:lessonId/completion', validate({ params: lessonParams }), learningController.uncomplete);
