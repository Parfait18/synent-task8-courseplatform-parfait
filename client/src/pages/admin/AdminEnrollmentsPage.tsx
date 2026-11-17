import { useState } from 'react'
import { Pager } from '@/components/Pager'
import { ErrorState } from '@/components/States'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminPageHeader, StatusBadge, TableCard, TableState } from '@/features/admin/components'
import { CourseFilter } from '@/features/admin/CourseFilter'
import { useAdminEnrollments } from '@/features/admin/api'
import { formatDate, formatPaise } from '@/lib/format'

export function AdminEnrollmentsPage() {
  const [page, setPage] = useState(1)
  const [course, setCourse] = useState<string | undefined>()
  const { data, isPending, isError, error, refetch } = useAdminEnrollments({ page, limit: 20, course })
  return (
    <>
      <AdminPageHeader title="Enrollments" description="One row per learner and course, with their progress." />
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <TableCard toolbar={<CourseFilter value={course} onChange={(next) => { setCourse(next); setPage(1) }} />}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState columns={6} isLoading={isPending} isEmpty={data?.items.length === 0} emptyText="No enrolment for this filter." />
              {data?.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.user?.name ?? 'Deleted user'}</p>
                    <p className="text-xs text-muted-foreground">{row.user?.email}</p>
                  </TableCell>
                  <TableCell>{row.course?.title ?? 'Deleted course'}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.progress}%</TableCell>
                  <TableCell>{row.payment ? <StatusBadge status={row.payment.status} /> : <StatusBadge status="free" />}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.payment ? formatPaise(row.payment.amount) : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(row.enrolledAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {data && <div className="mt-3"><Pager page={data.page} totalPages={data.totalPages} onPageChange={setPage} label="Enrolment pages" /></div>}
    </>
  )
}
