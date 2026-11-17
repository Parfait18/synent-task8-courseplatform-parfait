import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Circle, ListVideo } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { LessonPlayer } from '@/components/LessonPlayer'
import { ProgressMeter } from '@/components/ProgressMeter'
import { ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { queryKeys, useLearn, type LearnData } from '@/hooks/queries'
import { api, ApiError, errorMessage } from '@/lib/api'
import { formatDuration, plural } from '@/lib/format'
import type { Progress } from '@/lib/types'
import { cn } from '@/lib/utils'

function CourseOutline({ data, currentLessonId, onSelect }: { data: LearnData; currentLessonId: string | null; onSelect: (lessonId: string) => void }) {
  const completed = new Set(data.progress.completedLessonIds)
  return (
    <nav aria-label="Course contents">
      <ProgressMeter percent={data.progress.percent} label="Course progress" detail={`${data.progress.completedCount} of ${plural(data.progress.totalCount, 'lesson')}`} />
      <ol className="mt-6 space-y-6">
        {data.course.modules.map((module, moduleIndex) => (
          <li key={module.id}>
            <h2 className="text-sm font-semibold">
              <span className="font-normal text-muted-foreground">Module {moduleIndex + 1}. </span>
              {module.title}
            </h2>
            <ul className="mt-2 space-y-0.5">
              {module.lessons.map((lesson) => {
                const isCurrent = lesson.id === currentLessonId
                const isDone = completed.has(lesson.id)
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(lesson.id)}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={cn('flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-ink/5', isCurrent && 'bg-ink text-white hover:bg-ink')}
                    >
                      {isDone ? (
                        <Check aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', isCurrent ? 'text-marigold' : 'text-leaf')} />
                      ) : (
                        <Circle aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', isCurrent ? 'text-white/70' : 'text-graphite/60')} />
                      )}
                      <span className="min-w-0 flex-1">
                        {lesson.title}
                        <span className="sr-only">{isDone ? ' (completed)' : ''}</span>
                      </span>
                      <span className={cn('shrink-0 tabular-nums', isCurrent ? 'text-white/80' : 'text-muted-foreground')}>{formatDuration(lesson.durationMinutes)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function LearnPage() {
  const { courseId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { data, isPending, isError, error, refetch } = useLearn(courseId)
  const [isOutlineOpen, setIsOutlineOpen] = useState(false)

  const lessons = useMemo(
    () => data?.course.modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title }))) ?? [],
    [data],
  )
  const requestedId = params.get('lesson')
  const currentLesson = lessons.find((lesson) => lesson.id === requestedId) ?? lessons.find((lesson) => lesson.id === (data?.lastLessonId ?? data?.progress.nextLessonId)) ?? lessons[0]
  const currentIndex = currentLesson ? lessons.indexOf(currentLesson) : -1
  const previous = currentIndex > 0 ? lessons[currentIndex - 1] : undefined
  const next = currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : undefined
  const isCompleted = currentLesson ? (data?.progress.completedLessonIds.includes(currentLesson.id) ?? false) : false

  useEffect(() => {
    if (currentLesson) document.title = `${currentLesson.title} | ${data?.course.title} | Kalam`
  }, [currentLesson, data?.course.title])

  const completion = useMutation({
    mutationFn: ({ lessonId, done }: { lessonId: string; done: boolean }) =>
      done ? api.put<{ progress: Progress }>(`/learn/${courseId}/lessons/${lessonId}/completion`) : api.delete<{ progress: Progress }>(`/learn/${courseId}/lessons/${lessonId}/completion`),
    onSuccess: ({ progress }, { done }) => {
      queryClient.setQueryData<LearnData>(queryKeys.learn(courseId), (previousData) => (previousData ? { ...previousData, progress } : previousData))
      void queryClient.invalidateQueries({ queryKey: ['me'] })
      if (done && progress.percent === 100) toast.success('Course completed. Well done.')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  function selectLesson(lessonId: string) {
    setParams({ lesson: lessonId }, { replace: true })
    setIsOutlineOpen(false)
    window.scrollTo({ top: 0 })
  }

  if (isPending) {
    return <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[20rem_1fr]"><Skeleton className="hidden h-96 lg:block" /><Skeleton className="aspect-video w-full" /></div>
  }
  if (isError) {
    if (error instanceof ApiError && error.code === 'NOT_ENROLLED') {
      return (
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-[2rem] font-bold">Enrol to open this course</h1>
          <p className="mt-2 text-muted-foreground">The lessons are available once you are enrolled.</p>
          <Button asChild className="mt-6"><Link to="/courses">Browse courses</Link></Button>
        </div>
      )
    }
    return <div className="mx-auto max-w-4xl px-4 py-12"><ErrorState error={error} onRetry={() => refetch()} /></div>
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[20rem_1fr] lg:py-10">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-line bg-white p-5">
          <Link to={`/courses/${data.course.slug}`} className="font-heading text-lg leading-tight font-bold underline-offset-4 hover:underline">{data.course.title}</Link>
          <div className="mt-4"><CourseOutline data={data} currentLessonId={currentLesson?.id ?? null} onSelect={selectLesson} /></div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <Link to={`/courses/${data.course.slug}`} className="min-w-0 truncate font-heading font-bold">{data.course.title}</Link>
          <Sheet open={isOutlineOpen} onOpenChange={setIsOutlineOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 bg-white"><ListVideo aria-hidden="true" /> Contents</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(22rem,90vw)] overflow-y-auto bg-white">
              <SheetHeader>
                <SheetTitle>{data.course.title}</SheetTitle>
                <SheetDescription>Choose a lesson</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6"><CourseOutline data={data} currentLessonId={currentLesson?.id ?? null} onSelect={selectLesson} /></div>
            </SheetContent>
          </Sheet>
        </div>

        <ProgressMeter className="mb-4 lg:hidden" percent={data.progress.percent} label="Course progress" detail={`${data.progress.completedCount} of ${plural(data.progress.totalCount, 'lesson')}`} />

        {data.isPreview && (
          <p className="mb-4 rounded-lg bg-marigold-soft px-4 py-2.5 text-sm">Admin preview: you are not enrolled, so progress is not saved.</p>
        )}

        {currentLesson ? (
          <>
            <LessonPlayer url={currentLesson.videoUrl} title={currentLesson.title} />
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{currentLesson.moduleTitle}, lesson {currentIndex + 1} of {lessons.length}</p>
                <h1 className="mt-1 text-[1.5625rem] font-bold sm:text-[2rem]">{currentLesson.title}</h1>
              </div>
              {!data.isPreview && (
                <Button
                  onClick={() => completion.mutate({ lessonId: currentLesson.id, done: !isCompleted })}
                  disabled={completion.isPending}
                  aria-pressed={isCompleted}
                  variant={isCompleted ? 'outline' : 'default'}
                  className={cn('h-10 shrink-0 px-4', isCompleted ? 'border-leaf/40 bg-white text-leaf hover:text-leaf' : 'bg-marigold font-semibold text-ink hover:bg-marigold/85')}
                >
                  <Check aria-hidden="true" /> {isCompleted ? 'Completed' : 'Mark as complete'}
                </Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6">
              {previous ? (
                <Button variant="ghost" onClick={() => selectLesson(previous.id)} className="max-w-full"><ChevronLeft aria-hidden="true" /> <span className="truncate">{previous.title}</span></Button>
              ) : <span />}
              {next && (
                <Button variant="outline" onClick={() => selectLesson(next.id)} className="ml-auto max-w-full bg-white">
                  <span className="truncate">Next: {next.title}</span> <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">This course has no lessons yet.</p>
        )}
      </div>
    </div>
  )
}
