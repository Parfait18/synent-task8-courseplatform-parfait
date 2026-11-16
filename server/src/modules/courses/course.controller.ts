import type { Request, Response } from 'express';
import { input } from '../../middlewares/validate.js';
import type { CatalogQuery } from './course.schemas.js';
import { courseService } from './course.service.js';

export const courseController = {
  async list(req: Request, res: Response) {
    res.json(await courseService.listCatalog(input.query<CatalogQuery>(req)));
  },

  async meta(_req: Request, res: Response) {
    res.json(courseService.meta());
  },

  async detail(req: Request, res: Response) {
    const { slug } = input.params<{ slug: string }>(req);
    res.json({ course: await courseService.getBySlug(slug, req.auth?.userId) });
  },
};
