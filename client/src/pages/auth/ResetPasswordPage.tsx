import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import { resetSchema } from '@/lib/schemas'
import { AuthShell } from './AuthShell'

type ResetValues = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { register, handleSubmit, formState, setError } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) })

  async function onSubmit(values: ResetValues) {
    try {
      const response = await api.post<{ message: string }>('/auth/reset-password', { token, password: values.password })
      toast.success(response.message)
      navigate('/login', { replace: true })
    } catch (error) {
      setError('root', { message: errorMessage(error) })
    }
  }

  if (!token) {
    return (
      <AuthShell title="This link is incomplete" intro="Open the link from the reset email again, or ask for a new one.">
        <Button asChild className="h-10 w-full"><Link to="/forgot-password">Ask for a new link</Link></Button>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Choose a new password" intro="Signing in again will be needed on every device.">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formState.errors.root && (
          <p role="alert" className="rounded-lg bg-margin-red/8 px-3 py-2 text-sm text-margin-red">
            {formState.errors.root.message} <Link to="/forgot-password" className="underline">Ask for a new link</Link>
          </p>
        )}
        <TextField label="New password" type="password" autoComplete="new-password" hint="At least 10 characters, with a letter and a digit." error={formState.errors.password?.message} {...register('password')} />
        <TextField label="Repeat the new password" type="password" autoComplete="new-password" error={formState.errors.confirm?.message} {...register('confirm')} />
        <Button type="submit" className="h-10 w-full text-base" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Saving…' : 'Save the new password'}
        </Button>
      </form>
    </AuthShell>
  )
}
