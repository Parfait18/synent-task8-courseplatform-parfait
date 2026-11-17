import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, hasSessionHint, onSessionChange, refreshSession, setSession, type Session } from '@/lib/api'
import type { User } from '@/lib/types'
import { AuthContext, type AuthState } from './auth-context'

/** Restores the session from the refresh cookie on load and exposes login/logout. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = onSessionChange((session) => {
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'anonymous')
    })
    // refreshSession shares one request, so StrictMode's double effect does not rotate twice.
    if (hasSessionHint()) void refreshSession()
    else setSession(null)
    return () => {
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.post<Session>('/auth/login', { email, password })
    setSession(session)
    queryClient.clear()
    return session.user
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setSession(null)
      queryClient.clear()
    }
  }, [queryClient])

  const reloadUser = useCallback(async () => {
    const { user: fresh } = await api.get<{ user: User }>('/me')
    setUser(fresh)
  }, [])

  const value = useMemo<AuthState>(() => ({ status, user, login, logout, reloadUser }), [status, user, login, logout, reloadUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
