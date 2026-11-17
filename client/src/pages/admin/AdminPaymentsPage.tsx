import { useState } from 'react'
import { Pager } from '@/components/Pager'
import { ErrorState } from '@/components/States'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminPageHeader, StatusBadge, TableCard, TableState } from '@/features/admin/components'
import { CourseFilter } from '@/features/admin/CourseFilter'
import { useAdminPayments } from '@/features/admin/api'
import { formatDate, formatPaise } from '@/lib/format'

export function AdminPaymentsPage() {
  const [page, setPage] = useState(1)
  const [course, setCourse] = useState<string | undefined>()
  const [status, setStatus] = useState<string | undefined>()
  const { data, isPending, isError, error, refetch } = useAdminPayments({ page, limit: 20, course, status })
  return (
    <>
      <AdminPageHeader title="Payments" description="Every checkout order. Pending orders were opened but not paid; amounts are verified on the server." />
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <TableCard
          toolbar={
            <>
              <CourseFilter value={course} onChange={(next) => { setCourse(next); setPage(1) }} />
              <div className="w-40 space-y-1">
                <Label htmlFor="filter-status" className="text-xs font-semibold">Status</Label>
                <Select value={status ?? 'all'} onValueChange={(next) => { setStatus(next === 'all' ? undefined : next); setPage(1) }}>
                  <SelectTrigger id="filter-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="created">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Learner</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Order and payment ids</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState columns={7} isLoading={isPending} isEmpty={data?.items.length === 0} emptyText="No payment for this filter." />
              {data?.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.user?.name ?? 'Deleted user'}</p>
                    <p className="text-xs text-muted-foreground">{row.user?.email}</p>
                  </TableCell>
                  <TableCell>{row.course?.title ?? 'Deleted course'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPaise(row.amount)}</TableCell>
                  <TableCell><StatusBadge status={row.status} /></TableCell>
                  <TableCell>{row.provider === 'mock' ? 'Test (mock)' : 'Razorpay'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <p>{row.orderId}</p>
                    <p>{row.paymentId ?? 'Not paid'}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {data && <div className="mt-3"><Pager page={data.page} totalPages={data.totalPages} onPageChange={setPage} label="Payment pages" /></div>}
    </>
  )
}
