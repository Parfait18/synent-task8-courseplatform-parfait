interface LessonTree {
  modules: { lessons: { _id: { toString(): string } }[] }[];
}

export interface Progress {
  completedLessonIds: string[];
  completedCount: number;
  totalCount: number;
  percent: number;
  nextLessonId: string | null;
}

/**
 * Pure progress computation. Only completions of lessons that still exist count, so the
 * percentage stays correct after an admin adds or removes lessons. Rounded down so a course
 * reads 100 % only when every lesson is done.
 */
export function computeProgress(course: LessonTree, completed: { toString(): string }[]): Progress {
  const lessonIds = course.modules.flatMap((module) => module.lessons.map((lesson) => lesson._id.toString()));
  const completedSet = new Set(completed.map((id) => id.toString()));
  const completedLessonIds = lessonIds.filter((id) => completedSet.has(id));
  const totalCount = lessonIds.length;
  const percent = totalCount === 0 ? 0 : Math.floor((completedLessonIds.length / totalCount) * 100);
  const nextLessonId = lessonIds.find((id) => !completedSet.has(id)) ?? lessonIds[0] ?? null;
  return { completedLessonIds, completedCount: completedLessonIds.length, totalCount, percent, nextLessonId };
}
