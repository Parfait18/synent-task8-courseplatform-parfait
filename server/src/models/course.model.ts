import { Schema, Types, model, type HydratedDocument, type InferSchemaType } from 'mongoose';

export const COURSE_CATEGORIES = ['development', 'design', 'data', 'business', 'marketing', 'photography'] as const;
export const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];
export type CourseLevel = (typeof COURSE_LEVELS)[number];

const lessonSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  videoUrl: { type: String, required: true, trim: true },
  durationMinutes: { type: Number, required: true, min: 0, max: 600 },
  isFreePreview: { type: Boolean, default: false },
});

const moduleSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  lessons: { type: [lessonSchema], default: [] },
});

/**
 * Modules and lessons are embedded: they are always read with their course, they are small,
 * and a reorder becomes a single atomic update. Array order is display order.
 */
const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, enum: COURSE_CATEGORIES, required: true },
    level: { type: String, enum: COURSE_LEVELS, required: true },
    /** Whole rupees. 0 means the course is free. */
    price: { type: Number, required: true, min: 0, max: 500_000, index: true },
    instructor: { type: String, required: true, trim: true, maxlength: 80 },
    isPublished: { type: Boolean, default: false },
    modules: { type: [moduleSchema], default: [] },
  },
  { timestamps: true },
);

courseSchema.index({ isPublished: 1, category: 1, createdAt: -1 });
courseSchema.index({ isPublished: 1, level: 1 });

export type Course = InferSchemaType<typeof courseSchema> & { _id: Types.ObjectId };
export type CourseDocument = HydratedDocument<InferSchemaType<typeof courseSchema>>;
export const CourseModel = model('Course', courseSchema);
