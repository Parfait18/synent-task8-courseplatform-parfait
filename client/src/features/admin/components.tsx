import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableRow } from '@/components/ui/table'
import type { PaymentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const statusStyles: Record<string, string> = {
  published: 'bg-leaf/10 text-leaf',
  draft: 'bg-muted text-graphite',
  paid: 'bg-leaf/10 text-leaf',
  created: 'bg-marigold-soft text-ink',
  failed: 'bg-margin-red/10 text-margin-red',
  free: 'bg-muted text-graphite',
}

const statusLabels: Record<string, string> = { published: 'Published', draft: 'Draft', paid: 'Paid', created: 'Pending', failed: 'Failed', free: 'Free' }

export function StatusBadge({ status }: { status: 'published' | 'draft' | PaymentStatus | 'free' }) {
  return <Badge className={cn('rounded-sm border-0 font-semibold', statusStyles[status])}>{statusLabels[status]}</Badge>
}

/** Table body placeholders while data loads, and a single-row message when the list is empty. */
export function TableState({ columns, isLoading, isEmpty, emptyText }: { columns: number; isLoading: boolean; isEmpty: boolean; emptyText: string }) {
  if (isLoading) {
    return (
      <>
        {[0, 1, 2, 3].map((row) => (
          <TableRow key={row}>
            <TableCell colSpan={columns}><Skeleton className="h-5 w-full" /></TableCell>
          </TableRow>
        ))}
      </>
    )
  }
  if (isEmpty) {
    return (
      <TableRow>
        <TableCell colSpan={columns} className="py-10 text-center text-muted-foreground">{emptyText}</TableCell>
      </TableRow>
    )
  }
  return null
}

/** Card frame for dense tables; horizontal scroll stays inside it on small screens. */
export function TableCard({ children, toolbar }: { children: ReactNode; toolbar?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white">
      {toolbar && <div className="flex flex-wrap items-end gap-3 border-b border-line p-3">{toolbar}</div>}
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}
