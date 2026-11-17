import { describe, expect, it } from 'vitest'
import { formatDuration, formatPaise, formatPrice, plural } from './format'

describe('format helpers', () => {
  it('should show free courses as "Free" and prices in rupees with Indian grouping', () => {
    expect(formatPrice(0)).toBe('Free')
    expect(formatPrice(149999)).toBe('₹1,49,999')
  })

  it('should convert paise to rupees', () => {
    expect(formatPaise(249900)).toBe('₹2,499')
  })

  it('should format durations in minutes and hours', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(93)).toBe('1 h 33 min')
  })

  it('should pluralise counts', () => {
    expect(plural(1, 'lesson')).toBe('1 lesson')
    expect(plural(3, 'lesson')).toBe('3 lessons')
  })
})
