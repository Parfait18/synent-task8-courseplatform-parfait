import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../models/course.model.js';

export const objectIdSchema = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid identifier.');

export const catalogQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(80).optional().transform((value) => value || undefined),
  category: z.enum(COURSE_CATEGORIES).optional(),
  level: z.enum(COURSE_LEVELS).optional(),
  price: z.enum(['free', 'paid']).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'title']).default('newest'),
});

export const slugParamsSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,90}$/, 'Invalid course address.') });
export const courseIdParamsSchema = z.object({ courseId: objectIdSchema });

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
