import type { Category, Level } from './types'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

/** Course prices are whole rupees; 0 reads "Free". */
export function formatPrice(rupees: number): string {
  return rupees === 0 ? 'Free' : inr.format(rupees)
}

/** Payment amounts are stored in paise. */
export function formatPaise(paise: number): string {
  return inr.format(paise / 100)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export const categoryLabels: Record<Category, string> = {
  development: 'Development',
  design: 'Design',
  data: 'Data',
  business: 'Business',
  marketing: 'Marketing',
  photography: 'Photography',
}

export const levelLabels: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export function plural(count: number, word: string, pluralWord = `${word}s`) {
  return `${count} ${count === 1 ? word : pluralWord}`
}
