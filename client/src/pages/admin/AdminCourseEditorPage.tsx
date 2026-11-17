import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { ErrorState } from '@/components/States'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminPageHeader, StatusBadge } from '@/features/admin/components'
import { CourseForm } from '@/features/admin/CourseForm'
import { LessonForm } from '@/features/admin/LessonForm'
import { useAdminCourse, useCourseMutation, type CourseInput, type LessonInput } from '@/features/admin/api'
import { api } from '@/lib/api'
import { formatDuration, formatPrice, plural } from '@/lib/format'
import type { CourseFull } from '@/lib/types'
import { parseVideoUrl } from '@/lib/video'

type CourseResponse = { course: CourseFull }
type LessonDialog = { moduleId: string; lessonId?: string; defaults?: LessonInput } | null
type Confirm = { title: string; description: string; action: () => void } | null

/** Swaps an item with its neighbour and returns the ids in the new order. */
function moved(ids: string[], index: number, direction: -1 | 1): string[] {
  const next = [...ids]
  const target = index + direction
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

export function AdminCourseEditorPage() {
  const { id = '' } = useParams()
  const { data: course, isPending, isError, error, refetch } = useAdminCourse(id)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [renaming, setRenaming] = useState<{ moduleId: string; title: string } | null>(null)
  const [lessonDialog, setLessonDialog] = useState<LessonDialog>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const base = `/admin/courses/${id}`

  const updateCourse = useCourseMutation(id, (values: CourseInput) => api.patch<CourseResponse>(base, values), 'Course details saved.')
  const publication = useCourseMutation(id, (isPublished: boolean) => api.patch<CourseResponse>(`${base}/publication`, { isPublished }), 'Publication updated.')
  const addModule = useCourseMutation(id, (title: string) => api.post<CourseResponse>(`${base}/modules`, { title }), 'Module added.')
  const renameModule = useCourseMutation(id, ({ moduleId, title }: { moduleId: string; title: string }) => api.patch<CourseResponse>(`${base}/modules/${moduleId}`, { title }), 'Module renamed.')
  const deleteModule = useCourseMutation(id, (moduleId: string) => api.delete<CourseResponse>(`${base}/modules/${moduleId}`), 'Module deleted.')
  const reorderModules = useCourseMutation(id, (ids: string[]) => api.put<CourseResponse>(`${base}/modules/order`, { ids }), 'Modules reordered.')
  const addLesson = useCourseMutation(id, ({ moduleId, values }: { moduleId: string; values: LessonInput }) => api.post<CourseResponse>(`${base}/modules/${moduleId}/lessons`, values), 'Lesson added.')
  const updateLesson = useCourseMutation(id, ({ moduleId, lessonId, values }: { moduleId: string; lessonId: string; values: LessonInput }) => api.patch<CourseResponse>(`${base}/modules/${moduleId}/lessons/${lessonId}`, values), 'Lesson saved.')
  const deleteLesson = useCourseMutation(id, ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) => api.delete<CourseResponse>(`${base}/modules/${moduleId}/lessons/${lessonId}`), 'Lesson deleted.')
  const reorderLessons = useCourseMutation(id, ({ moduleId, ids }: { moduleId: string; ids: string[] }) => api.put<CourseResponse>(`${base}/modules/${moduleId}/lessons/order`, { ids }), 'Lessons reordered.')

  if (isPending) return <div className="space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64 w-full" /></div>
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />

  async function submitModule(event: FormEvent) {
    event.preventDefault()
    if (newModuleTitle.trim().length < 2) return
    await addModule.mutateAsync(newModuleTitle.trim())
    setNewModuleTitle('')
  }

  async function submitLesson(values: LessonInput) {
    if (!lessonDialog) return
    if (lessonDialog.lessonId) await updateLesson.mutateAsync({ moduleId: lessonDialog.moduleId, lessonId: lessonDialog.lessonId, values })
    else await addLesson.mutateAsync({ moduleId: lessonDialog.moduleId, values })
    setLessonDialog(null)
  }

  const moduleIds = course.modules.map((module) => module.id)

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted-foreground">
        <Link to="/admin/courses" className="underline-offset-4 hover:underline">Courses</Link> / <span>{course.title}</span>
      </nav>
      <AdminPageHeader
        title={course.title}
        description={`${formatPrice(course.price)}, ${plural(course.moduleCount, 'module')}, ${plural(course.lessonCount, 'lesson')}, ${formatDuration(course.totalMinutes)}`}
        actions={
          <>
            <StatusBadge status={course.isPublished ? 'published' : 'draft'} />
            <Button variant="outline" asChild><Link to={`/learn/${course.id}`}><Eye aria-hidden="true" /> Preview</Link></Button>
            <Button onClick={() => publication.mutate(!course.isPublished)} disabled={publication.isPending} variant={course.isPublished ? 'outline' : 'default'}>
              {course.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Modules and lessons</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4 space-y-4">
          {course.modules.length === 0 && <p className="rounded-lg border border-dashed border-input p-6 text-center text-muted-foreground">No module yet. Add the first one below, then add lessons to it.</p>}
          <ol className="space-y-4">
            {course.modules.map((module, moduleIndex) => {
              const lessonIds = module.lessons.map((lesson) => lesson.id)
              return (
                <li key={module.id} className="rounded-lg border border-line bg-white">
                  <div className="flex flex-wrap items-center gap-2 border-b border-line bg-muted/50 px-3 py-2">
                    <h2 className="min-w-0 flex-1 text-sm font-semibold">
                      <span className="font-normal text-muted-foreground">Module {moduleIndex + 1}. </span>{module.title}
                    </h2>
                    <Button variant="ghost" size="icon-sm" aria-label={`Move ${module.title} up`} disabled={moduleIndex === 0 || reorderModules.isPending} onClick={() => reorderModules.mutate(moved(moduleIds, moduleIndex, -1))}><ArrowUp aria-hidden="true" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Move ${module.title} down`} disabled={moduleIndex === course.modules.length - 1 || reorderModules.isPending} onClick={() => reorderModules.mutate(moved(moduleIds, moduleIndex, 1))}><ArrowDown aria-hidden="true" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Rename ${module.title}`} onClick={() => setRenaming({ moduleId: module.id, title: module.title })}><Pencil aria-hidden="true" /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${module.title}`} onClick={() => setConfirm({ title: `Delete the module “${module.title}”?`, description: `Its ${plural(module.lessons.length, 'lesson')} are deleted too. Learner progress on them stops counting.`, action: () => deleteModule.mutate(module.id) })}><Trash2 aria-hidden="true" /></Button>
                  </div>
                  <ul className="divide-y divide-line">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                        <span className="w-6 text-right text-muted-foreground tabular-nums">{lessonIndex + 1}</span>
                        <span className="min-w-40 flex-1 font-medium">{lesson.title}</span>
                        {lesson.isFreePreview && <Badge variant="outline" className="rounded-sm">Preview</Badge>}
                        <span className="text-xs text-muted-foreground">{parseVideoUrl(lesson.videoUrl).kind === 'youtube' ? 'YouTube' : 'Video file'}</span>
                        <span className="w-16 text-right text-muted-foreground tabular-nums">{formatDuration(lesson.durationMinutes)}</span>
                        <span className="flex">
                          <Button variant="ghost" size="icon-sm" aria-label={`Move ${lesson.title} up`} disabled={lessonIndex === 0 || reorderLessons.isPending} onClick={() => reorderLessons.mutate({ moduleId: module.id, ids: moved(lessonIds, lessonIndex, -1) })}><ArrowUp aria-hidden="true" /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label={`Move ${lesson.title} down`} disabled={lessonIndex === module.lessons.length - 1 || reorderLessons.isPending} onClick={() => reorderLessons.mutate({ moduleId: module.id, ids: moved(lessonIds, lessonIndex, 1) })}><ArrowDown aria-hidden="true" /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${lesson.title}`} onClick={() => setLessonDialog({ moduleId: module.id, lessonId: lesson.id, defaults: { title: lesson.title, videoUrl: lesson.videoUrl, durationMinutes: lesson.durationMinutes, isFreePreview: lesson.isFreePreview } })}><Pencil aria-hidden="true" /></Button>
                          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${lesson.title}`} onClick={() => setConfirm({ title: `Delete the lesson “${lesson.title}”?`, description: 'Learners lose access to it immediately. This cannot be undone.', action: () => deleteLesson.mutate({ moduleId: module.id, lessonId: lesson.id }) })}><Trash2 aria-hidden="true" /></Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 py-2">
                    <Button variant="ghost" size="sm" onClick={() => setLessonDialog({ moduleId: module.id })}><Plus aria-hidden="true" /> Add a lesson</Button>
                  </div>
                </li>
              )
            })}
          </ol>
          <form onSubmit={submitModule} className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-3">
            <div className="min-w-56 flex-1 space-y-1">
              <Label htmlFor="new-module" className="text-xs font-semibold">New module title</Label>
              <Input id="new-module" value={newModuleTitle} onChange={(event) => setNewModuleTitle(event.target.value)} placeholder="For example: Getting started" maxLength={140} />
            </div>
            <Button type="submit" disabled={newModuleTitle.trim().length < 2 || addModule.isPending}><Plus aria-hidden="true" /> Add module</Button>
          </form>
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <div className="max-w-3xl rounded-lg border border-line bg-white p-4 sm:p-5">
            <CourseForm
              key={course.updatedAt}
              submitLabel="Save details"
              defaultValues={{ title: course.title, summary: course.summary, description: course.description, category: course.category, level: course.level, price: course.price, instructor: course.instructor }}
              onSubmit={(values) => updateCourse.mutateAsync(values).catch(() => undefined)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={renaming !== null} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename module</DialogTitle>
            <DialogDescription>Learners see the new title right away.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              if (!renaming || renaming.title.trim().length < 2) return
              await renameModule.mutateAsync({ moduleId: renaming.moduleId, title: renaming.title.trim() })
              setRenaming(null)
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="rename-module">Module title</Label>
              <Input id="rename-module" value={renaming?.title ?? ''} onChange={(event) => setRenaming((current) => (current ? { ...current, title: event.target.value } : current))} maxLength={140} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
              <Button type="submit" disabled={renameModule.isPending}>Rename</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={lessonDialog !== null} onOpenChange={(open) => !open && setLessonDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lessonDialog?.lessonId ? 'Edit lesson' : 'Add a lesson'}</DialogTitle>
            <DialogDescription>Lessons play in the order shown in the module.</DialogDescription>
          </DialogHeader>
          {lessonDialog && <LessonForm defaultValues={lessonDialog.defaults} submitLabel={lessonDialog.lessonId ? 'Save lesson' : 'Add lesson'} onSubmit={(values) => submitLesson(values).catch(() => undefined)} onCancel={() => setLessonDialog(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { confirm?.action(); setConfirm(null) }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
