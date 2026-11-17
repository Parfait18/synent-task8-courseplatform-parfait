import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Pager } from '@/components/Pager'
import { ErrorState } from '@/components/States'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminPageHeader, StatusBadge, TableCard, TableState } from '@/features/admin/components'
import { CourseForm } from '@/features/admin/CourseForm'
import { useAdminCourses, type AdminCourseRow, type CourseInput } from '@/features/admin/api'
import { api, errorMessage } from '@/lib/api'
import { categoryLabels, formatDate, formatPrice } from '@/lib/format'
import type { CourseFull } from '@/lib/types'

export function AdminCoursesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchDraft, setSearchDraft] = useState(params.get('search') ?? '')
  const [isCreating, setIsCreating] = useState(false)
  const [toDelete, setToDelete] = useState<AdminCourseRow | null>(null)
  const page = Number(params.get('page')) || 1
  const status = params.get('status') ?? undefined
  const search = params.get('search') ?? undefined
  const { data, isPending, isError, error, refetch } = useAdminCourses({ page, limit: 20, status, search })

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((search ?? '') === searchDraft.trim()) return
      const next = new URLSearchParams(params)
      if (searchDraft.trim()) next.set('search', searchDraft.trim())
      else next.delete('search')
      next.delete('page')
      setParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] })
    void queryClient.invalidateQueries({ queryKey: ['catalog'] })
  }

  const create = useMutation({
    mutationFn: (values: CourseInput) => api.post<{ course: CourseFull }>('/admin/courses', values),
    onSuccess: ({ course }) => {
      refresh()
      toast.success('Course created as a draft. Add modules and lessons next.')
      navigate(`/admin/courses/${course.id}`)
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const publication = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => api.patch(`/admin/courses/${id}/publication`, { isPublished }),
    onSuccess: (_data, { isPublished }) => {
      refresh()
      toast.success(isPublished ? 'Course published.' : 'Course unpublished.')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/courses/${id}`),
    onSuccess: () => {
      refresh()
      toast.success('Course deleted.')
    },
    onError: (failure) => toast.error(errorMessage(failure)),
    onSettled: () => setToDelete(null),
  })

  return (
    <>
      <AdminPageHeader
        title="Courses"
        description="Drafts are visible only here. Publish a course to list it in the catalogue."
        actions={<Button onClick={() => setIsCreating(true)}><Plus aria-hidden="true" /> New course</Button>}
      />
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <TableCard
          toolbar={
            <>
              <div className="min-w-56 flex-1 space-y-1">
                <Label htmlFor="admin-course-search" className="text-xs font-semibold">Search by title</Label>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="admin-course-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} className="pl-8" />
                </div>
              </div>
              <div className="w-40 space-y-1">
                <Label htmlFor="admin-course-status" className="text-xs font-semibold">Status</Label>
                <Select
                  value={status ?? 'all'}
                  onValueChange={(value) => {
                    const next = new URLSearchParams(params)
                    if (value === 'all') next.delete('status')
                    else next.set('status', value)
                    next.delete('page')
                    setParams(next, { replace: true })
                  }}
                >
                  <SelectTrigger id="admin-course-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Lessons</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState columns={8} isLoading={isPending} isEmpty={data?.items.length === 0} emptyText="No course matches. Create one with “New course”." />
              {data?.items.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="max-w-72">
                    <Link to={`/admin/courses/${course.id}`} className="font-medium underline-offset-4 hover:underline">{course.title}</Link>
                    <p className="truncate text-xs text-muted-foreground">{course.instructor}</p>
                  </TableCell>
                  <TableCell>{categoryLabels[course.category]}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(course.price)}</TableCell>
                  <TableCell className="text-right tabular-nums">{course.lessonCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{course.enrollmentCount}</TableCell>
                  <TableCell><StatusBadge status={course.isPublished ? 'published' : 'draft'} /></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(course.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${course.title}`}><MoreHorizontal aria-hidden="true" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => navigate(`/admin/courses/${course.id}`)}>Edit content</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => publication.mutate({ id: course.id, isPublished: !course.isPublished })}>{course.isPublished ? 'Unpublish' : 'Publish'}</DropdownMenuItem>
                        {course.isPublished && <DropdownMenuItem onSelect={() => window.open(`/courses/${course.slug}`, '_blank', 'noopener')}>View in catalogue</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(course)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {data && (
        <div className="mt-3">
          <Pager page={data.page} totalPages={data.totalPages} onPageChange={(next) => { const p = new URLSearchParams(params); p.set('page', String(next)); setParams(p) }} label="Course pages" />
        </div>
      )}

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>The course starts as a draft. You add modules and lessons on the next screen.</DialogDescription>
          </DialogHeader>
          <CourseForm submitLabel="Create course" onSubmit={(values) => create.mutateAsync(values).then(() => setIsCreating(false)).catch(() => undefined)} onCancel={() => setIsCreating(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && toDelete.enrollmentCount > 0
                ? `${toDelete.enrollmentCount} learners are enrolled, so this course cannot be deleted. Unpublish it to hide it from the catalogue.`
                : 'The course, its modules and its lessons are removed for good. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {toDelete && toDelete.enrollmentCount === 0 && (
              <AlertDialogAction variant="destructive" onClick={() => remove.mutate(toDelete.id)}>Delete course</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
