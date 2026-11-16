import { z } from 'zod';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../models/course.model.js';
import { PAYMENT_STATUSES } from '../../models/payment.model.js';
import { objectIdSchema } from '../courses/course.schemas.js';

const optionalSearch = z.string().trim().max(80).optional().transform((value) => value || undefined);

/** http(s) only: rejects javascript: and data: URLs that would end up in a player. */
const videoUrl = z
  .url({ protocol: /^https?$/, message: 'Enter an http or https video URL.' })
  .max(500);

export const courseBodySchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(240),
  description: z.string().trim().min(20).max(5000),
  category: z.enum(COURSE_CATEGORIES),
  level: z.enum(COURSE_LEVELS),
  price: z.coerce.number().int('Use a whole number of rupees.').min(0).max(500_000),
  instructor: z.string().trim().min(2).max(80),
});
export const courseUpdateSchema = courseBodySchema.partial().refine((value) => Object.keys(value).length > 0, 'Send at least one field.');

export const publicationSchema = z.object({ isPublished: z.boolean() });

export const moduleBodySchema = z.object({ title: z.string().trim().min(2).max(140) });

export const lessonBodySchema = z.object({
  title: z.string().trim().min(2).max(140),
  videoUrl,
  durationMinutes: z.coerce.number().int().min(0).max(600),
  isFreePreview: z.boolean().default(false),
});
export const lessonUpdateSchema = lessonBodySchema.partial().refine((value) => Object.keys(value).length > 0, 'Send at least one field.');

export const orderSchema = z.object({ ids: z.array(objectIdSchema).min(1).max(200) });

export const courseParams = z.object({ id: objectIdSchema });
export const moduleParams = courseParams.extend({ moduleId: objectIdSchema });
export const lessonParams = moduleParams.extend({ lessonId: objectIdSchema });
export const idParams = z.object({ id: objectIdSchema });

export const adminCoursesQuery = paginationQuerySchema.extend({ search: optionalSearch, status: z.enum(['published', 'draft']).optional() });
export const adminUsersQuery = paginationQuerySchema.extend({ search: optionalSearch });
export const adminEnrollmentsQuery = paginationQuerySchema.extend({ course: objectIdSchema.optional() });
export const adminPaymentsQuery = paginationQuerySchema.extend({ course: objectIdSchema.optional(), status: z.enum(PAYMENT_STATUSES).optional() });

export type CourseBody = z.infer<typeof courseBodySchema>;
export type LessonBody = z.infer<typeof lessonBodySchema>;
