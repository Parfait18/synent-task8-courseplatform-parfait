import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminCourses } from './api'

/** Course picker for list filters (first 50 courses by last update). */
export function CourseFilter({ value, onChange }: { value?: string; onChange: (courseId: string | undefined) => void }) {
  const { data } = useAdminCourses({ page: 1, limit: 50 })
  return (
    <div className="w-full space-y-1 sm:w-72">
      <Label htmlFor="filter-course" className="text-xs font-semibold">Course</Label>
      <Select value={value ?? 'all'} onValueChange={(next) => onChange(next === 'all' ? undefined : next)}>
        <SelectTrigger id="filter-course" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All courses</SelectItem>
          {data?.items.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
