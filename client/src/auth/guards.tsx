import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './auth-context'

function FullPageSpinner() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[50vh] place-items-center text-muted-foreground">
      Loading your session…
    </div>
  )
}

/** Signed-in users only; others go to /login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <>{children}</>
}

/** Admins only. The server enforces the same rule on every /admin API route. */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Pages like /login make no sense once signed in. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
  return <>{children}</>
}
