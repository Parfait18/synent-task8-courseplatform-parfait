import { describe, expect, it } from 'vitest';
import { computeProgress } from '../src/modules/learning/progress.js';

const id = (value: string) => ({ toString: () => value });
const course = { modules: [{ lessons: [{ _id: id('a') }, { _id: id('b') }] }, { lessons: [{ _id: id('c') }] }] };

describe('computeProgress', () => {
  it('should be 0 with nothing completed and point to the first lesson', () => {
    expect(computeProgress(course, [])).toMatchObject({ percent: 0, completedCount: 0, totalCount: 3, nextLessonId: 'a' });
  });

  it('should round down so a course is 100 % only when every lesson is done', () => {
    expect(computeProgress(course, [id('a'), id('b')]).percent).toBe(66);
    expect(computeProgress(course, [id('a'), id('b'), id('c')]).percent).toBe(100);
  });

  it('should ignore completions of lessons that no longer exist', () => {
    expect(computeProgress(course, [id('a'), id('deleted')])).toMatchObject({ completedCount: 1, percent: 33, completedLessonIds: ['a'] });
  });

  it('should point to the first lesson not completed, in course order', () => {
    expect(computeProgress(course, [id('a'), id('c')]).nextLessonId).toBe('b');
  });

  it('should handle a course without lessons', () => {
    expect(computeProgress({ modules: [] }, [])).toMatchObject({ percent: 0, totalCount: 0, nextLessonId: null });
  });
});
