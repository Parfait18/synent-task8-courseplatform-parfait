import type { Types } from 'mongoose';
import { skipFor, type PaginationQuery } from '../../lib/pagination.js';
import { escapeRegExp } from '../../lib/strings.js';
import { CourseModel, type CourseCategory, type CourseLevel } from '../../models/course.model.js';

export interface CatalogFilter {
  search?: string;
  category?: CourseCategory;
  level?: CourseLevel;
  price?: 'free' | 'paid';
  sort: 'newest' | 'price-asc' | 'price-desc' | 'title';
}

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1, createdAt: -1 },
  'price-desc': { price: -1, createdAt: -1 },
  title: { title: 1 },
} as const;

/** The only module that queries the `courses` collection. */
export const courseRepository = {
  async findPublished(filter: CatalogFilter, page: PaginationQuery) {
    const query: Record<string, unknown> = { isPublished: true };
    if (filter.category) query.category = filter.category;
    if (filter.level) query.level = filter.level;
    if (filter.price === 'free') query.price = 0;
    if (filter.price === 'paid') query.price = { $gt: 0 };
    if (filter.search) query.title = new RegExp(escapeRegExp(filter.search), 'i');
    const [items, total] = await Promise.all([
      CourseModel.find(query).sort(SORTS[filter.sort]).skip(skipFor(page)).limit(page.limit).lean(),
      CourseModel.countDocuments(query),
    ]);
    return { items, total };
  },

  findPublishedBySlug(slug: string) {
    return CourseModel.findOne({ slug, isPublished: true }).lean();
  },

  findById(id: string | Types.ObjectId) {
    return CourseModel.findById(id).lean();
  },

  /** Hydrated document, for admin edits that rely on schema validation on save. */
  findDocumentById(id: string | Types.ObjectId) {
    return CourseModel.findById(id);
  },

  slugExists(slug: string) {
    return CourseModel.exists({ slug });
  },

  async searchAll(query: PaginationQuery & { search?: string; status?: 'published' | 'draft' }) {
    const filter: Record<string, unknown> = {};
    if (query.search) filter.title = new RegExp(escapeRegExp(query.search), 'i');
    if (query.status) filter.isPublished = query.status === 'published';
    const [items, total] = await Promise.all([
      CourseModel.find(filter).sort({ updatedAt: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
      CourseModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  create(data: Record<string, unknown>) {
    return CourseModel.create(data);
  },

  deleteById(id: string) {
    return CourseModel.deleteOne({ _id: id });
  },

  countPublished() {
    return CourseModel.countDocuments({ isPublished: true });
  },

  findTitles(ids: Types.ObjectId[]) {
    return CourseModel.find({ _id: { $in: ids } }).select('title slug').lean();
  },
};
