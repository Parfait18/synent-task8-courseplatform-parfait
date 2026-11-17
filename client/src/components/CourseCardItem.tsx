import { Link } from 'react-router'
import { formatDuration, formatPrice, levelLabels, plural } from '@/lib/format'
import type { CourseCard } from '@/lib/types'
import { CourseCover } from './CourseCover'

/** Catalogue entry: the cover carries the identity, the text below carries the decision facts. */
export function CourseCardItem({ course }: { course: CourseCard }) {
  return (
    <article className="group relative flex gap-4 sm:flex-col sm:gap-0">
      {/* Small screens: a compact row with a thumbnail cover; larger screens: the full cover. */}
      <div className="w-24 shrink-0 sm:hidden">
        <CourseCover title={course.title} category={course.category} level={course.level} size="sm" />
      </div>
      <CourseCover title={course.title} category={course.category} level={course.level} lessonCount={course.lessonCount} className="hidden transition-transform duration-200 group-hover:-translate-y-1 motion-reduce:transform-none sm:block" />
      <div className="flex min-w-0 flex-1 flex-col sm:mt-4">
        <h3 className="text-lg font-semibold">
          <Link to={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-ink">
            {course.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
        <p className="mt-auto pt-3 text-sm text-muted-foreground">
          {levelLabels[course.level]}, {plural(course.lessonCount, 'lesson')}, {formatDuration(course.totalMinutes)}
        </p>
        <p className={course.price === 0 ? 'mt-1 font-heading font-bold text-leaf' : 'mt-1 font-heading font-bold'}>{formatPrice(course.price)}</p>
      </div>
    </article>
  )
}
