import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { categoryLabels, levelLabels } from '@/lib/format'
import type { CourseInput } from './api'

const courseSchema = z.object({
  title: z.string().trim().min(3, 'Use at least 3 characters.').max(120),
  summary: z.string().trim().min(10, 'Use at least 10 characters.').max(240, 'Keep the summary under 240 characters.'),
  description: z.string().trim().min(20, 'Use at least 20 characters.').max(5000),
  category: z.enum(['development', 'design', 'data', 'business', 'marketing', 'photography']),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  price: z.number({ message: 'Enter a price in rupees (0 for free).' }).int('Use a whole number of rupees.').min(0).max(500000),
  instructor: z.string().trim().min(2, 'Enter the instructor name.').max(80),
})

interface CourseFormProps {
  defaultValues?: Partial<CourseInput>
  submitLabel: string
  onSubmit: (values: CourseInput) => Promise<unknown>
  onCancel?: () => void
}

export function CourseForm({ defaultValues, submitLabel, onSubmit, onCancel }: CourseFormProps) {
  const { register, handleSubmit, control, formState } = useForm<CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: { category: 'development', level: 'beginner', price: 0, ...defaultValues },
  })
  const errors = formState.errors
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
      <TextField className="sm:col-span-2" label="Title" error={errors.title?.message} {...register('title')} />
      <TextField className="sm:col-span-2" label="Summary" hint="One sentence shown on the catalogue card." error={errors.summary?.message} {...register('summary')} />
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="course-description" className="text-sm font-semibold">Description</Label>
        <Textarea id="course-description" rows={5} aria-invalid={errors.description ? true : undefined} aria-describedby={errors.description ? 'course-description-error' : undefined} className="bg-white text-base" {...register('description')} />
        {errors.description && <p id="course-description-error" className="text-sm text-margin-red">{errors.description.message}</p>}
      </div>
      {(['category', 'level'] as const).map((field) => (
        <div key={field} className="space-y-1.5">
          <Label htmlFor={`course-${field}`} className="text-sm font-semibold">{field === 'category' ? 'Subject' : 'Level'}</Label>
          <Controller
            control={control}
            name={field}
            render={({ field: controlled }) => (
              <Select value={controlled.value} onValueChange={controlled.onChange}>
                <SelectTrigger id={`course-${field}`} className="h-10! w-full bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(field === 'category' ? categoryLabels : levelLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      ))}
      <TextField label="Price (₹)" type="number" inputMode="numeric" min={0} step={1} hint="Whole rupees. 0 makes the course free." error={errors.price?.message} {...register('price', { valueAsNumber: true })} />
      <TextField label="Instructor" error={errors.instructor?.message} {...register('instructor')} />
      <div className="flex justify-end gap-2 sm:col-span-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" disabled={formState.isSubmitting}>{formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  )
}
