import { AppError } from '../../lib/app-error.js';
import type { UserRole } from '../../models/user.model.js';
import { presentCourseFull } from '../courses/course.presenter.js';
import { courseRepository } from '../courses/course.repository.js';
import { enrollmentRepository } from '../enrollments/enrollment.repository.js';
import { computeProgress } from './progress.js';

export const learningService = {
  /** Full course content with video URLs. Enrolled learners only; admins may preview any course. */
  async getCourse(userId: string, role: UserRole, courseId: string) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('COURSE_NOT_FOUND', 'This course does not exist.');
    const enrollment = await enrollmentRepository.findOne(userId, course._id);
    if (!enrollment && role !== 'admin') throw AppError.forbidden('NOT_ENROLLED', 'Enrol in this course to open its lessons.');
    return {
      course: presentCourseFull(course),
      progress: computeProgress(course, enrollment?.completedLessons ?? []),
      lastLessonId: enrollment?.lastLesson?.toString() ?? null,
      isPreview: !enrollment,
    };
  },

  async setLessonCompletion(userId: string, courseId: string, lessonId: string, isCompleted: boolean) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('COURSE_NOT_FOUND', 'This course does not exist.');
    const lessonExists = course.modules.some((module) => module.lessons.some((lesson) => lesson._id.toString() === lessonId));
    if (!lessonExists) throw AppError.notFound('LESSON_NOT_FOUND', 'This lesson does not exist in the course.');
    const enrollment = await enrollmentRepository.setLessonCompletion(userId, course._id, lessonId, isCompleted);
    if (!enrollment) throw AppError.forbidden('NOT_ENROLLED', 'Enrol in this course to track your progress.');
    return { progress: computeProgress(course, enrollment.completedLessons) };
  },
};
