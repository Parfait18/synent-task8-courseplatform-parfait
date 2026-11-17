import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import type { z } from 'zod'
import { useAuth } from '@/auth/auth-context'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/api'
import { loginSchema } from '@/lib/schemas'
import { AuthShell } from './AuthShell'

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from
  const { register, handleSubmit, formState } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginValues) {
    setFormError(null)
    try {
      const user = await login(values.email, values.password)
      navigate(from ?? (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true })
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <AuthShell
      title="Sign in"
      intro="Pick up where you left off."
      footer={
        <>
          New to Kalam? <Link className="font-semibold text-ink underline underline-offset-4" to="/register">Create an account</Link>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-lg bg-margin-red/8 px-3 py-2 text-sm text-margin-red">
            {formError}
          </p>
        )}
        <TextField label="Email" type="email" autoComplete="email" error={formState.errors.email?.message} {...register('email')} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          labelAction={<Link to="/forgot-password" className="text-sm text-graphite underline underline-offset-4">Forgot your password?</Link>}
          {...register('password')}
        />
        <Button type="submit" className="h-10 w-full text-base" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}
