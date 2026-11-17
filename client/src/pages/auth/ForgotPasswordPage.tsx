import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import type { z } from 'zod'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import { forgotSchema } from '@/lib/schemas'
import { AuthShell } from './AuthShell'

export function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) })

  async function onSubmit(values: z.infer<typeof forgotSchema>) {
    setFormError(null)
    try {
      const response = await api.post<{ message: string }>('/auth/forgot-password', values)
      setMessage(response.message)
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  if (message) {
    return (
      <AuthShell title="Check your inbox" intro={message}>
        <p className="text-sm text-muted-foreground">The link expires in 30 minutes.</p>
        <Button asChild variant="outline" className="mt-6 h-10 w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </AuthShell>
    )
  }
  return (
    <AuthShell title="Reset your password" intro="Enter the email of your account. We will send you a link to choose a new password." footer={<Link className="underline underline-offset-4" to="/login">Back to sign in</Link>}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && <p role="alert" className="text-sm text-margin-red">{formError}</p>}
        <TextField label="Email" type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
        <Button type="submit" className="h-10 w-full text-base" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Sending…' : 'Send the reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}
