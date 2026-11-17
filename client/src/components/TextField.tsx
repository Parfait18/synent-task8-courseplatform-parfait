import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
  labelAction?: ReactNode
}

/** Label, input, hint and error wired together with aria-describedby and aria-invalid. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, error, hint, labelAction, className, id, ...props }, ref) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={inputId} className="text-sm font-semibold">
          {label}
        </Label>
        {labelAction}
      </div>
      <Input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className="h-10 bg-white text-base"
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-margin-red">
          {error}
        </p>
      )}
    </div>
  )
})
