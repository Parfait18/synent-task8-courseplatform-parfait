import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressMeter } from './ProgressMeter'

describe('ProgressMeter', () => {
  it('should expose the value to assistive technology', () => {
    render(<ProgressMeter percent={33.4} label="Course progress" detail="2 of 6 lessons" />)
    const bar = screen.getByRole('progressbar', { name: 'Course progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText('2 of 6 lessons')).toBeInTheDocument()
  })

  it('should clamp values outside 0 to 100', () => {
    render(<ProgressMeter percent={140} label="Progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})
