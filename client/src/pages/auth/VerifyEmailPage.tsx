import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/auth-context'
import { Button } from '@/components/ui/button'
import { api, errorMessage } from '@/lib/api'
import { AuthShell } from './AuthShell'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { status, reloadUser } = useAuth()
  const verify = useMutation({
    mutationFn: () => api.post<{ message: string }>('/auth/verify-email', { token }),
    onSuccess: () => {
      if (status === 'authenticated') void reloadUser()
    },
  })
  // The token is single use: StrictMode must not send it twice.
  const hasStarted = useRef(false)
  useEffect(() => {
    if (token && !hasStarted.current) {
      hasStarted.current = true
      verify.mutate()
    }
  }, [token, verify])

  if (!token) {
    return <AuthShell title="This link is incomplete" intro="Open the link from the confirmation email again, or request a new one after signing in." />
  }
  if (verify.isError) {
    return (
      <AuthShell title="This link no longer works" intro={errorMessage(verify.error)}>
        <Button asChild className="h-10 w-full">
          <Link to="/login">Sign in to request a new link</Link>
        </Button>
      </AuthShell>
    )
  }
  if (verify.isSuccess) {
    return (
      <AuthShell title="Your email is confirmed" intro="You can now enrol in any course.">
        <CheckCircle2 aria-hidden="true" className="mb-4 size-10 text-leaf" />
        <Button asChild className="h-10 w-full">
          <Link to={status === 'authenticated' ? '/courses' : '/login'}>{status === 'authenticated' ? 'Browse courses' : 'Sign in'}</Link>
        </Button>
      </AuthShell>
    )
  }
  return <AuthShell title="Confirming your email…" intro={<span role="status">One moment.</span>} />
}
