import type { Course } from '../../models/course.model.js';

type CourseLike = Pick<Course, '_id' | 'title' | 'slug' | 'summary' | 'description' | 'category' | 'level' | 'price' | 'instructor' | 'isPublished' | 'modules'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

function totals(course: Pick<CourseLike, 'modules'>) {
  let lessonCount = 0;
  let totalMinutes = 0;
  for (const module of course.modules) {
    lessonCount += module.lessons.length;
    for (const lesson of module.lessons) totalMinutes += lesson.durationMinutes;
  }
  return { moduleCount: course.modules.length, lessonCount, totalMinutes };
}

/** Catalogue card: no modules, no videos. */
export function presentCourseCard(course: CourseLike) {
  return {
    id: course._id.toString(),
    slug: course.slug,
    title: course.title,
    summary: course.summary,
    category: course.category,
    level: course.level,
    price: course.price,
    instructor: course.instructor,
    ...totals(course),
  };
}

/**
 * Public course page. Lesson video URLs are only included for free previews,
 * so the content of a paid course cannot be read without enrolling.
 */
export function presentCourseDetail(course: CourseLike, isEnrolled: boolean) {
  return {
    ...presentCourseCard(course),
    description: course.description,
    isEnrolled,
    modules: course.modules.map((module) => ({
      id: module._id.toString(),
      title: module.title,
      lessons: module.lessons.map((lesson) => ({
        id: lesson._id.toString(),
        title: lesson.title,
        durationMinutes: lesson.durationMinutes,
        isFreePreview: lesson.isFreePreview,
        videoUrl: lesson.isFreePreview || isEnrolled ? lesson.videoUrl : null,
      })),
    })),
  };
}

/** Full content, for enrolled learners and admins. */
export function presentCourseFull(course: CourseLike) {
  return {
    ...presentCourseCard(course),
    description: course.description,
    isPublished: course.isPublished,
    createdAt: course.createdAt?.toISOString(),
    updatedAt: course.updatedAt?.toISOString(),
    modules: course.modules.map((module) => ({
      id: module._id.toString(),
      title: module.title,
      lessons: module.lessons.map((lesson) => ({
        id: lesson._id.toString(),
        title: lesson.title,
        durationMinutes: lesson.durationMinutes,
        isFreePreview: lesson.isFreePreview,
        videoUrl: lesson.videoUrl,
      })),
    })),
  };
}
