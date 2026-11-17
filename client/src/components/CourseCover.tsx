import { categoryLabels, levelLabels } from '@/lib/format'
import type { Category, Level } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CourseCoverProps {
  title: string
  category: Category
  level: Level
  lessonCount?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Generated course cover, modelled on a school exercise book: a solid cover in the colour of the
 * subject, a stitched spine, and the white name label. Decorative (the title is always shown as
 * text next to it), so it is hidden from assistive technology.
 */
export function CourseCover({ title, category, level, lessonCount, size = 'md', className }: CourseCoverProps) {
  // The design cover is light (marigold): its text is ink, every other cover uses white.
  const onLight = category === 'design'
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate aspect-[4/5] w-full overflow-hidden rounded-[4px_10px_10px_4px] shadow-[inset_0_-2px_0_rgb(0_0_0/0.12)]',
        onLight ? 'text-ink' : 'text-white',
        className,
      )}
      style={{ backgroundColor: `var(--cover-${category})` }}
    >
      {/* Spine with stitching */}
      <div className="absolute inset-y-0 left-0 w-[9%] bg-black/20">
        <div className="absolute inset-y-2 right-[30%] border-r-2 border-dashed border-white/40" />
      </div>
      {/* Fine cover grain: faint ruled texture, like pressed board */}
      <div className="absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(0deg,currentColor_0_1px,transparent_1px_6px)]" />

      {size !== 'sm' && (
        <p className={cn('absolute top-[7%] left-[16%] font-heading font-semibold', size === 'lg' ? 'text-base' : 'text-[0.8125rem]')}>
          {categoryLabels[category]}
        </p>
      )}

      <div
        className={cn(
          'absolute right-[9%] left-[17%] rounded-[3px] bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.18)]',
          size === 'sm' ? 'bottom-[18%] h-[26%]' : 'bottom-[11%] p-[7%]',
        )}
      >
        {size !== 'sm' && (
          <>
            <p className={cn('font-heading leading-tight font-bold', size === 'lg' ? 'line-clamp-3 text-2xl' : 'line-clamp-3 text-[1.05rem]')}>{title}</p>
            <div className={cn('mt-3 space-y-1.5 text-graphite', size === 'lg' ? 'text-sm' : 'text-[0.75rem]')}>
              <p className="flex justify-between gap-2 border-b border-line pb-1">
                <span>Level</span>
                <span className="font-medium text-ink">{levelLabels[level]}</span>
              </p>
              {lessonCount !== undefined && (
                <p className="flex justify-between gap-2 border-b border-line pb-1">
                  <span>Lessons</span>
                  <span className="font-medium text-ink">{lessonCount}</span>
                </p>
              )}
            </div>
          </>
        )}
        {size === 'sm' && (
          <div className="flex h-full flex-col justify-center gap-[18%] px-[12%]">
            <span className="h-px bg-line" />
            <span className="h-px bg-line" />
          </div>
        )}
      </div>
    </div>
  )
}
