import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CourseCardItem } from '@/components/CourseCardItem'
import { Pager } from '@/components/Pager'
import { EmptyState, ErrorState } from '@/components/States'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCatalog, type CatalogFilters } from '@/hooks/queries'
import { categoryLabels, levelLabels, plural } from '@/lib/format'

const ALL = 'all'

const filterOptions = {
  category: [[ALL, 'All subjects'], ...Object.entries(categoryLabels)],
  level: [[ALL, 'All levels'], ...Object.entries(levelLabels)],
  price: [[ALL, 'Any price'], ['free', 'Free'], ['paid', 'Paid']],
  sort: [['newest', 'Newest'], ['price-asc', 'Price, low to high'], ['price-desc', 'Price, high to low'], ['title', 'Title, A to Z']],
} as const

const filterLabels = { category: 'Subject', level: 'Level', price: 'Price', sort: 'Sort by' } as const
type FilterKey = keyof typeof filterOptions

/** Filters live in the URL, so a filtered list can be bookmarked and shared. */
export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const filters: CatalogFilters = {
    search: params.get('search') ?? undefined,
    category: params.get('category') ?? undefined,
    level: params.get('level') ?? undefined,
    price: params.get('price') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: Number(params.get('page')) || 1,
  }
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '')
  const { data, isPending, isError, error, refetch, isFetching } = useCatalog(filters, 12)

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === ALL) next.delete(key)
      else next.set(key, value)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  // Debounced search: the URL (and the request) follows the input after a short pause.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((filters.search ?? '') !== searchDraft.trim()) update({ search: searchDraft.trim() || undefined })
    }, 300)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  const hasFilters = Boolean(filters.search || filters.category || filters.level || filters.price)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[2rem] font-bold sm:text-[2.75rem]">Courses</h1>
      <p className="mt-2 max-w-xl text-graphite">Every course is a sequence of short video lessons. Search by title or narrow the list by subject, level and price.</p>

      <form role="search" className="mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white p-4 sm:gap-4 sm:p-5 lg:grid-cols-[2fr_repeat(4,1fr)]" onSubmit={(event) => event.preventDefault()}>
        <div className="col-span-2 space-y-1.5 lg:col-span-1">
          <Label htmlFor="catalog-search" className="text-sm font-semibold">Search</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-graphite" />
            <Input id="catalog-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="For example: React, SQL, pricing" className="h-10 bg-white pl-9 text-base" maxLength={80} />
          </div>
        </div>
        {(Object.keys(filterOptions) as FilterKey[]).map((key) => (
          <div key={key} className="min-w-0 space-y-1.5">
            <Label htmlFor={`filter-${key}`} className="text-sm font-semibold">{filterLabels[key]}</Label>
            <Select value={params.get(key) ?? (key === 'sort' ? 'newest' : ALL)} onValueChange={(value) => update({ [key]: key === 'sort' && value === 'newest' ? undefined : value })}>
              <SelectTrigger id={`filter-${key}`} className="h-10! w-full bg-white text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions[key].map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </form>

      <div className="mt-8 flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {data ? `${plural(data.total, 'course')}${hasFilters ? ' match your filters' : ''}` : ' '}
          {isFetching && !isPending ? ' (updating…)' : ''}
        </p>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchDraft('')
              setParams(new URLSearchParams(), { replace: true })
            }}
          >
            <X aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>

      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {isPending && (
        <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="aspect-[4/5] w-full rounded-lg" />)}
        </div>
      )}
      {data && data.items.length === 0 && (
        <EmptyState className="mt-6" title="No course matches these filters" action={<Button variant="outline" onClick={() => { setSearchDraft(''); setParams(new URLSearchParams(), { replace: true }) }}>Show all courses</Button>}>
          Try a shorter search or remove a filter.
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <>
          <div className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-4">
            {data.items.map((course) => <CourseCardItem key={course.id} course={course} />)}
          </div>
          <div className="mt-12">
            <Pager page={data.page} totalPages={data.totalPages} onPageChange={(page) => { update({ page: String(page) }); window.scrollTo({ top: 0 }) }} label="Course pages" />
          </div>
        </>
      )}
    </div>
  )
}
