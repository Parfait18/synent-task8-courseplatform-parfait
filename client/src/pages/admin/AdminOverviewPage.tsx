import { Link } from 'react-router'
import { ErrorState } from '@/components/States'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminPageHeader, TableCard, TableState } from '@/features/admin/components'
import { useAdminStats } from '@/features/admin/api'
import { formatDate, formatPaise } from '@/lib/format'

export function AdminOverviewPage() {
  const { data, isPending, isError, error, refetch } = useAdminStats()
  const tiles = data
    ? [
        { label: 'Learners', value: data.users.toLocaleString('en-IN'), to: '/admin/users' },
        { label: 'Enrollments', value: data.enrollments.toLocaleString('en-IN'), to: '/admin/enrollments' },
        { label: 'Revenue', value: formatPaise(data.revenue.amount), to: '/admin/payments' },
        { label: 'Published courses', value: data.publishedCourses.toLocaleString('en-IN'), to: '/admin/courses?status=published' },
      ]
    : []

  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  return (
    <>
      <AdminPageHeader title="Overview" description="Totals since launch. Revenue counts verified payments only." />
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isPending
          ? [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-24 rounded-lg" />)
          : tiles.map((tile) => (
              <Link key={tile.label} to={tile.to} className="rounded-lg border border-line bg-white p-4 transition-colors hover:border-ink/40">
                <dt className="text-sm text-muted-foreground">{tile.label}</dt>
                <dd className="mt-1 font-heading text-[1.75rem] leading-tight font-bold tabular-nums">{tile.value}</dd>
              </Link>
            ))}
      </dl>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Latest payments</h2>
      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Paid on</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableState columns={4} isLoading={isPending} isEmpty={data?.recentPayments.length === 0} emptyText="No payment yet." />
            {data?.recentPayments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <p className="font-medium">{payment.user?.name ?? 'Deleted user'}</p>
                  <p className="text-xs text-muted-foreground">{payment.user?.email}</p>
                </TableCell>
                <TableCell>{payment.course?.title ?? 'Deleted course'}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPaise(payment.amount)}</TableCell>
                <TableCell>{formatDate(payment.paidAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </>
  )
}
