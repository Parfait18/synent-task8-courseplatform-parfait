import { cn } from '@/lib/utils'

/** Pen-nib mark and wordmark. "Kalam" means pen in Hindi and Urdu. */
export function Logo({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'white' }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-heading text-xl font-bold tracking-tight', tone === 'white' ? 'text-white' : 'text-ink', className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
        <path d="M12 2 19 9.5 14.5 20h-5L5 9.5Z" fill="var(--marigold)" />
        <path d="M12 2v10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="13" r="1.6" fill="currentColor" />
        <path d="M9.5 20h5v2h-5z" fill="currentColor" />
      </svg>
      Kalam
    </span>
  )
}
