import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

export function EmptyState({ title, children, action, className }: { title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-dashed border-input bg-card/60 px-6 py-12 text-center', className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-muted-foreground">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-margin-red/30 bg-white px-6 py-8 text-center">
      <p className="font-semibold text-margin-red">This page could not load.</p>
      <p className="mt-1 text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
