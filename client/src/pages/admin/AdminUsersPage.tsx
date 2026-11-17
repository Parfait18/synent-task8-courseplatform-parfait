import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Pager } from '@/components/Pager'
import { ErrorState } from '@/components/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminPageHeader, TableCard, TableState } from '@/features/admin/components'
import { useAdminUser, useAdminUsers } from '@/features/admin/api'
import { formatDate } from '@/lib/format'

function UserSheet({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data, isPending } = useAdminUser(userId)
  return (
    <Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{data?.user.name ?? 'User'}</SheetTitle>
          <SheetDescription>{data?.user.email}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {isPending && <Skeleton className="h-32 w-full" />}
          {data && (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">Role</dt><dd className="capitalize">{data.user.role}</dd>
                <dt className="text-muted-foreground">Email</dt><dd>{data.user.isEmailVerified ? 'Confirmed' : 'Not confirmed'}</dd>
                <dt className="text-muted-foreground">Joined</dt><dd>{formatDate(data.user.createdAt)}</dd>
              </dl>
              <h3 className="mt-6 mb-2 text-sm font-semibold">Enrollments ({data.enrollments.length})</h3>
              {data.enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not enrolled in any course.</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line text-sm">
                  {data.enrollments.map((enrollment) => (
                    <li key={enrollment.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{enrollment.course?.title ?? 'Deleted course'}</p>
                        <p className="text-xs text-muted-foreground">Since {formatDate(enrollment.enrolledAt)}</p>
                      </div>
                      <span className="tabular-nums">{enrollment.progress}%</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4"><Link to={`/admin/payments`}>See all payments</Link></Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const { data, isPending, isError, error, refetch } = useAdminUsers({ page, limit: 20, search: search || undefined })

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchDraft.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft])

  return (
    <>
      <AdminPageHeader title="Users" description="Accounts are created through registration. Admins are created by the seed script only." />
      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <TableCard
          toolbar={
            <div className="min-w-56 flex-1 space-y-1 sm:max-w-sm">
              <Label htmlFor="admin-user-search" className="text-xs font-semibold">Search by name or email</Label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="admin-user-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} className="pl-8" />
              </div>
            </div>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email status</TableHead>
                <TableHead className="text-right">Enrollments</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead><span className="sr-only">Details</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableState columns={7} isLoading={isPending} isEmpty={data?.items.length === 0} emptyText="No user matches this search." />
              {data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role === 'admin' ? <Badge className="rounded-sm">Admin</Badge> : 'Learner'}</TableCell>
                  <TableCell>{user.isEmailVerified ? 'Confirmed' : <span className="text-margin-red">Not confirmed</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{user.enrollmentCount}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(user.id)}>View<span className="sr-only"> {user.name}</span></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      {data && <div className="mt-3"><Pager page={data.page} totalPages={data.totalPages} onPageChange={setPage} label="User pages" /></div>}
      <UserSheet userId={selected} onClose={() => setSelected(null)} />
    </>
  )
}
