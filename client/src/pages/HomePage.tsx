import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { CourseCardItem } from '@/components/CourseCardItem'
import { CourseCover } from '@/components/CourseCover'
import { ProgressMeter } from '@/components/ProgressMeter'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog, useMyEnrollments } from '@/hooks/queries'
import { categoryLabels, plural } from '@/lib/format'
import type { Category } from '@/lib/types'

const subjects: Category[] = ['development', 'design', 'data', 'business', 'marketing', 'photography']

/** Fanned stack of real course covers: the product's one memorable image. */
function CoverShelf() {
  const { data } = useCatalog({ sort: 'newest' }, 4)
  const covers = data?.items ?? []
  const positions = ['-rotate-6 translate-x-0', 'rotate-[-1deg] translate-x-[38%] -translate-y-3', 'rotate-3 translate-x-[76%] translate-y-1', 'rotate-[8deg] translate-x-[114%] translate-y-4']
  return (
    <div className="relative mx-auto h-[19rem] w-full max-w-[26rem] sm:h-[23rem]" aria-hidden="true">
      {covers.length === 0
        ? [0, 1, 2].map((index) => <Skeleton key={index} className={`absolute top-6 left-0 aspect-[4/5] w-[46%] rounded-lg ${positions[index]}`} />)
        : covers.map((course, index) => (
            <div
              key={course.id}
              className={`shelf-cover absolute top-6 left-0 w-[46%] drop-shadow-[0_12px_18px_rgb(27_37_96/0.22)] ${positions[index]}`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <CourseCover title={course.title} category={course.category} level={course.level} lessonCount={course.lessonCount} />
            </div>
          ))}
    </div>
  )
}

function ContinueLearning() {
  const { status } = useAuth()
  const { data } = useMyEnrollments(1, status === 'authenticated')
  const current = data?.items.find((item) => item.progress.percent < 100)
  if (!current) return null
  return (
    <section aria-labelledby="continue-heading" className="mx-auto mt-10 max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center">
        <div className="w-20 shrink-0">
          <CourseCover title={current.course.title} category={current.course.category} level={current.course.level} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="continue-heading" className="text-sm font-normal text-muted-foreground">Continue where you left off</h2>
          <p className="mt-0.5 truncate font-heading text-xl font-semibold">{current.course.title}</p>
          <ProgressMeter className="mt-3 max-w-md" percent={current.progress.percent} label={`Progress in ${current.course.title}`} detail={`${current.progress.completedCount} of ${plural(current.progress.totalCount, 'lesson')}`} />
        </div>
        <Button asChild className="self-start sm:self-center">
          <Link to={`/learn/${current.course.id}${current.progress.nextLessonId ? `?lesson=${current.progress.nextLessonId}` : ''}`}>Resume</Link>
        </Button>
      </div>
    </section>
  )
}

export function HomePage() {
  const free = useCatalog({ price: 'free' }, 4)
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-4 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-12">
        <div>
          <h1 className="text-[2.5rem] leading-[1.05] font-bold sm:text-[3.5rem]">Pick a course. Finish it.</h1>
          <p className="mt-5 max-w-[34rem] text-lg text-graphite">
            Short video lessons from developers, designers and analysts who do the work every day. Your place is saved after each lesson, so ten minutes on the metro still counts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 bg-marigold px-5 text-base font-semibold text-ink hover:bg-marigold/85">
              <Link to="/courses">Browse courses</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 bg-white px-5 text-base">
              <Link to="/courses?price=free">Start with a free course</Link>
            </Button>
          </div>
        </div>
        <CoverShelf />
      </section>

      <ContinueLearning />

      <section aria-labelledby="subjects-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <h2 id="subjects-heading" className="text-[1.5625rem] font-bold">Subjects</h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {subjects.map((subject) => (
            <li key={subject}>
              <Link
                to={`/courses?category=${subject}`}
                className={`flex h-20 items-end rounded-[4px_10px_10px_4px] border-l-[10px] border-black/20 p-3 font-heading font-semibold transition-transform hover:-translate-y-0.5 motion-reduce:transform-none ${subject === 'design' ? 'text-ink' : 'text-white'}`}
                style={{ backgroundColor: `var(--cover-${subject})` }}
              >
                {categoryLabels[subject]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="free-heading" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="free-heading" className="text-[1.5625rem] font-bold">Free to start</h2>
            <p className="mt-1 text-muted-foreground">No payment needed. Create an account and press play.</p>
          </div>
          <Link to="/courses?price=free" className="hidden shrink-0 items-center gap-1 font-semibold underline-offset-4 hover:underline sm:inline-flex">
            All free courses <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-4">
          {free.data?.items.map((course) => <CourseCardItem key={course.id} course={course} />)}
          {free.isPending && [0, 1, 2, 3].map((index) => <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />)}
        </div>
      </section>
    </>
  )
}
