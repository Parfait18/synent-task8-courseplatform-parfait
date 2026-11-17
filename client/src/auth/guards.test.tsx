import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { User } from '@/lib/types'
import { AuthContext, type AuthState } from './auth-context'
import { AdminRoute, RequireAuth } from './guards'

function renderAt(path: string, auth: Partial<AuthState>) {
  const value: AuthState = { status: 'anonymous', user: null, login: async () => ({}) as User, logout: async () => {}, reloadUser: async () => {}, ...auth }
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <AdminRoute><p>Admin area</p></AdminRoute> },
      { path: '/dashboard', element: <RequireAuth><p>Dashboard</p></RequireAuth> },
      { path: '/login', element: <p>Login page</p> },
    ],
    { initialEntries: [path] },
  )
  render(<AuthContext.Provider value={value}><RouterProvider router={router} /></AuthContext.Provider>)
}

const learner: User = { id: '1', name: 'L', email: 'l@example.com', role: 'user', isEmailVerified: true }

describe('route guards', () => {
  it('should send anonymous visitors to the login page', () => {
    renderAt('/dashboard', { status: 'anonymous' })
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('should keep learners out of the admin area', () => {
    renderAt('/admin', { status: 'authenticated', user: learner })
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin area')).not.toBeInTheDocument()
  })

  it('should let admins in', () => {
    renderAt('/admin', { status: 'authenticated', user: { ...learner, role: 'admin' } })
    expect(screen.getByText('Admin area')).toBeInTheDocument()
  })

  it('should wait while the session is being restored', () => {
    renderAt('/admin', { status: 'loading' })
    expect(screen.getByRole('status')).toHaveTextContent('Loading your session')
  })
})
