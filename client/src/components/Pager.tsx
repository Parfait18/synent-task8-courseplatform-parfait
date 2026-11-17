import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PagerProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  label?: string
}

/** Previous / next pagination with the current position announced. */
export function Pager({ page, totalPages, onPageChange, label = 'Pagination' }: PagerProps) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 pt-2">
      <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        <ChevronLeft aria-hidden="true" /> Previous
      </Button>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Next <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
