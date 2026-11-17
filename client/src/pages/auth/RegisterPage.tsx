import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import type { z } from 'zod'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import { registerSchema } from '@/lib/schemas'
import { AuthShell } from './AuthShell'

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterValues) {
    setFormError(null)
    try {
      await api.post('/auth/register', values)
      setSentTo(values.email)
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" intro={<>We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it to activate your account, then sign in.</>}>
        <p className="text-sm text-muted-foreground">The link works once and expires in 24 hours. If nothing arrives in a few minutes, check your spam folder.</p>
        <Button asChild className="mt-6 h-10 w-full text-base">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      intro="Free to join. You pay only for the courses you choose."
      footer={
        <>
          Already have an account? <Link className="font-semibold text-ink underline underline-offset-4" to="/login">Sign in</Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-lg bg-margin-red/8 px-3 py-2 text-sm text-margin-red">
            {formError}
          </p>
        )}
        <TextField label="Name" autoComplete="name" error={formState.errors.name?.message} {...register('name')} />
        <TextField label="Email" type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters, with a letter and a digit."
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="h-10 w-full bg-marigold text-base font-semibold text-ink hover:bg-marigold/85" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}
