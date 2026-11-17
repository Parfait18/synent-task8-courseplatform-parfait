import { createContext, useContext } from 'react'
import type { User } from '@/lib/types'

export interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous'
  user: User | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** Re-reads the profile (for example after the email was confirmed). */
  reloadUser: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
