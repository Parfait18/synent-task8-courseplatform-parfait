import { cn } from '@/lib/utils'

interface ProgressMeterProps {
  percent: number
  label: string
  className?: string
  /** Shows "x of y lessons" under the bar. */
  detail?: string
}

/** Accessible progress bar: marigold fill on an ink-tinted track, values exposed to assistive tech. */
export function ProgressMeter({ percent, label, detail, className }: ProgressMeterProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{detail}</span>
        <span className="font-heading font-semibold tabular-nums">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-2 w-full overflow-hidden rounded-full bg-ink/10"
      >
        <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', value === 100 ? 'bg-leaf' : 'bg-marigold')} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
