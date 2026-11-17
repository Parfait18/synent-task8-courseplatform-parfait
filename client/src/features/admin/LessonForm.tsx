import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { parseVideoUrl } from '@/lib/video'
import type { LessonInput } from './api'

const lessonSchema = z.object({
  title: z.string().trim().min(2, 'Use at least 2 characters.').max(140),
  videoUrl: z
    .string()
    .trim()
    .url('Enter a full URL starting with https://')
    .refine((value) => parseVideoUrl(value).kind !== 'unsupported', 'Use a YouTube link or a direct link to an MP4 or WebM file.'),
  durationMinutes: z.number({ message: 'Enter the length in minutes.' }).int().min(0).max(600),
  isFreePreview: z.boolean(),
})

export function LessonForm({ defaultValues, submitLabel, onSubmit, onCancel }: { defaultValues?: Partial<LessonInput>; submitLabel: string; onSubmit: (values: LessonInput) => Promise<unknown>; onCancel: () => void }) {
  const { register, handleSubmit, control, formState } = useForm<LessonInput>({
    resolver: zodResolver(lessonSchema),
    defaultValues: { isFreePreview: false, durationMinutes: 5, ...defaultValues },
  })
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <TextField label="Lesson title" error={formState.errors.title?.message} {...register('title')} />
      <TextField label="Video URL" type="url" hint="YouTube link (played through youtube-nocookie.com) or a direct MP4 or WebM file." error={formState.errors.videoUrl?.message} {...register('videoUrl')} />
      <TextField label="Length (minutes)" type="number" inputMode="numeric" min={0} error={formState.errors.durationMinutes?.message} {...register('durationMinutes', { valueAsNumber: true })} />
      <Controller
        control={control}
        name="isFreePreview"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-line p-3">
            <div>
              <Label htmlFor="lesson-preview" className="font-semibold">Free preview</Label>
              <p className="text-xs text-muted-foreground">Anyone can watch this lesson from the course page.</p>
            </div>
            <Switch id="lesson-preview" checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={formState.isSubmitting}>{formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  )
}
