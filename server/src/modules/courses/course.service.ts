import { AppError } from '../../lib/app-error.js';
import { toPaginated } from '../../lib/pagination.js';
import { COURSE_CATEGORIES, COURSE_LEVELS } from '../../models/course.model.js';
import { enrollmentRepository } from '../enrollments/enrollment.repository.js';
import { presentCourseCard, presentCourseDetail } from './course.presenter.js';
import { courseRepository } from './course.repository.js';
import type { CatalogQuery } from './course.schemas.js';

export const courseService = {
  async listCatalog(query: CatalogQuery) {
    const { page, limit, ...filter } = query;
    const { items, total } = await courseRepository.findPublished(filter, { page, limit });
    return toPaginated(items.map(presentCourseCard), total, { page, limit });
  },

  async getBySlug(slug: string, userId?: string) {
    const course = await courseRepository.findPublishedBySlug(slug);
    if (!course) throw AppError.notFound('COURSE_NOT_FOUND', 'This course does not exist or is not published.');
    const isEnrolled = userId ? Boolean(await enrollmentRepository.findOne(userId, course._id)) : false;
    return presentCourseDetail(course, isEnrolled);
  },

  meta() {
    return { categories: COURSE_CATEGORIES, levels: COURSE_LEVELS };
  },
};
