import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { CourseCover } from '@/components/CourseCover'
import { Pager } from '@/components/Pager'
import { ProgressMeter } from '@/components/ProgressMeter'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyEnrollments } from '@/hooks/queries'
import { formatDate, plural } from '@/lib/format'
import type { MyEnrollment } from '@/lib/types'

function EnrollmentRow({ enrollment }: { enrollment: MyEnrollment }) {
  const { course, progress } = enrollment
  const isDone = progress.percent === 100
  const isNew = progress.completedCount === 0
  const lessonId = isDone ? null : progress.nextLessonId
  return (
    <li className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="w-20 shrink-0 sm:w-24">
        <CourseCover title={course.title} category={course.category} level={course.level} size="sm" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold">
          <Link to={`/courses/${course.slug}`} className="underline-offset-4 hover:underline">{course.title}</Link>
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{course.instructor}, enrolled {formatDate(enrollment.enrolledAt)}</p>
        <ProgressMeter
          className="mt-4 max-w-lg"
          percent={progress.percent}
          label={`Progress in ${course.title}`}
          detail={isDone ? 'Completed' : `${progress.completedCount} of ${plural(progress.totalCount, 'lesson')} done`}
        />
      </div>
      <Button asChild variant={isDone ? 'outline' : 'default'} className={isDone ? 'bg-white' : 'h-10 px-4'}>
        <Link to={`/learn/${course.id}${lessonId ? `?lesson=${lessonId}` : ''}`}>{isDone ? 'Review' : isNew ? 'Start' : 'Resume'}<span className="sr-only"> {course.title}</span></Link>
      </Button>
    </li>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const { data, isPending, isError, error, refetch } = useMyEnrollments(page)
  const firstName = user?.name.split(' ')[0]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[2rem] font-bold sm:text-[2.75rem]">My learning</h1>
      <p className="mt-2 text-graphite">{firstName ? `Welcome back, ${firstName}.` : ''} {data && data.total > 0 ? `You are enrolled in ${plural(data.total, 'course')}.` : ''}</p>

      <div className="mt-8">
        {isPending && <div className="space-y-4">{[0, 1].map((index) => <Skeleton key={index} className="h-36 w-full rounded-2xl" />)}</div>}
        {isError && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState title="No courses yet" action={<Button asChild><Link to="/courses">Browse courses</Link></Button>}>
            Courses you enrol in appear here with your progress. Several are free to start.
          </EmptyState>
        )}
        {data && data.items.length > 0 && (
          <>
            <ul className="space-y-4">{data.items.map((enrollment) => <EnrollmentRow key={enrollment.id} enrollment={enrollment} />)}</ul>
            <div className="mt-8"><Pager page={data.page} totalPages={data.totalPages} onPageChange={setPage} label="My courses pages" /></div>
          </>
        )}
      </div>
    </div>
  )
}
