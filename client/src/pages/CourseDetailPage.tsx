import { CheckCircle2, Clock, Layers, PlayCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/auth/auth-context'
import { CourseCover } from '@/components/CourseCover'
import { LessonPlayer } from '@/components/LessonPlayer'
import { ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourse } from '@/hooks/queries'
import { useStartCheckout } from '@/hooks/useEnroll'
import { ApiError, errorMessage } from '@/lib/api'
import { categoryLabels, formatDuration, formatPrice, levelLabels, plural } from '@/lib/format'
import type { CourseDetail, Lesson } from '@/lib/types'

function EnrollPanel({ course }: { course: CourseDetail }) {
  const { status, user } = useAuth()
  const navigate = useNavigate()
  const startCheckout = useStartCheckout()
  const isFree = course.price === 0

  if (course.isEnrolled) {
    return (
      <div className="rounded-2xl border border-leaf/30 bg-white p-5">
        <p className="flex items-center gap-2 font-semibold text-leaf"><CheckCircle2 aria-hidden="true" className="size-5" /> You are enrolled</p>
        <Button asChild className="mt-4 h-11 w-full text-base"><Link to={`/learn/${course.id}`}>Go to the course</Link></Button>
      </div>
    )
  }

  async function handleEnroll() {
    if (status !== 'authenticated') {
      navigate('/login', { state: { from: `/courses/${course.slug}` } })
      return
    }
    if (!user?.isEmailVerified) {
      toast.error('Confirm your email first: use the link we sent you, or ask for a new one in the banner above.')
      return
    }
    if (!isFree) {
      navigate(`/checkout/${course.slug}`)
      return
    }
    try {
      await startCheckout.mutateAsync(course.id)
      toast.success(`You are enrolled in ${course.title}.`)
      navigate(`/learn/${course.id}`)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'ALREADY_ENROLLED') navigate(`/learn/${course.id}`)
      else toast.error(errorMessage(error))
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className={`font-heading text-[2rem] leading-none font-bold ${isFree ? 'text-leaf' : ''}`}>{formatPrice(course.price)}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{isFree ? 'Free, forever. An account is all you need.' : 'One payment, then the course is yours to keep.'}</p>
      <Button onClick={handleEnroll} disabled={startCheckout.isPending} className="mt-5 h-11 w-full bg-marigold text-base font-semibold text-ink hover:bg-marigold/85">
        {startCheckout.isPending ? 'Enrolling…' : isFree ? 'Enroll for free' : 'Enroll now'}
      </Button>
      {status === 'anonymous' && <p className="mt-3 text-center text-xs text-muted-foreground">You will sign in or create an account first.</p>}
    </div>
  )
}

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { data: course, isPending, isError, error, refetch } = useCourse(slug, user?.id ?? 'anonymous')
  const [preview, setPreview] = useState<Lesson | null>(null)

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[18rem_1fr]">
        <Skeleton className="aspect-[4/5] w-full rounded-lg" />
        <div className="space-y-4"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-2/3" /></div>
      </div>
    )
  }
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-[2rem] font-bold">This course is not available</h1>
          <p className="mt-2 text-muted-foreground">It may have been unpublished or the address is wrong.</p>
          <Button asChild className="mt-6"><Link to="/courses">Browse all courses</Link></Button>
        </div>
      )
    }
    return <div className="mx-auto max-w-6xl px-4 py-12"><ErrorState error={error} onRetry={() => refetch()} /></div>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/courses" className="underline-offset-4 hover:underline">Courses</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/courses?category=${course.category}`} className="underline-offset-4 hover:underline">{categoryLabels[course.category]}</Link>
      </nav>
      <div className="grid gap-10 md:grid-cols-[17rem_1fr] lg:grid-cols-[19rem_1fr_19rem]">
        <div className="mx-auto w-48 md:w-full">
          <div className="md:sticky md:top-24">
            <CourseCover title={course.title} category={course.category} level={course.level} lessonCount={course.lessonCount} size="lg" />
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold sm:text-[2.75rem]">{course.title}</h1>
          <p className="mt-3 text-lg text-graphite">{course.summary}</p>
          <p className="mt-4 text-sm">Taught by <strong>{course.instructor}</strong></p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-graphite">
            <li className="flex items-center gap-1.5"><Layers aria-hidden="true" className="size-4" /> {plural(course.moduleCount, 'module')}, {plural(course.lessonCount, 'lesson')}</li>
            <li className="flex items-center gap-1.5"><Clock aria-hidden="true" className="size-4" /> {formatDuration(course.totalMinutes)} of video</li>
            <li>{levelLabels[course.level]} level</li>
          </ul>

          <div className="mt-8 lg:hidden"><EnrollPanel course={course} /></div>

          <section aria-labelledby="about-heading" className="mt-10">
            <h2 id="about-heading" className="text-[1.5625rem] font-bold">About this course</h2>
            <p className="mt-3 max-w-[68ch] leading-relaxed whitespace-pre-line">{course.description}</p>
          </section>

          <section aria-labelledby="curriculum-heading" className="mt-10">
            <h2 id="curriculum-heading" className="text-[1.5625rem] font-bold">Curriculum</h2>
            <ol className="mt-4 space-y-4">
              {course.modules.map((module, moduleIndex) => (
                <li key={module.id} className="overflow-hidden rounded-xl border border-line bg-white">
                  <h3 className="flex items-baseline gap-3 border-b border-line bg-muted/60 px-4 py-3 text-base font-semibold">
                    <span className="text-sm font-normal text-muted-foreground">Module {moduleIndex + 1}</span>
                    {module.title}
                  </h3>
                  <ul>
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                        <PlayCircle aria-hidden="true" className="size-4 shrink-0 text-graphite" />
                        <span className="min-w-0 flex-1">{lesson.title}</span>
                        {lesson.isFreePreview && lesson.videoUrl && (
                          <Button variant="link" size="sm" className="h-auto px-0 font-semibold" onClick={() => setPreview(lesson)}>
                            Preview<span className="sr-only"> {lesson.title}</span>
                          </Button>
                        )}
                        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{formatDuration(lesson.durationMinutes)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="hidden lg:block" aria-label="Enrolment">
          <div className="sticky top-24"><EnrollPanel course={course} /></div>
        </aside>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
            <DialogDescription>Free preview from {course.title}</DialogDescription>
          </DialogHeader>
          {preview?.videoUrl && <LessonPlayer url={preview.videoUrl} title={preview.title} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
