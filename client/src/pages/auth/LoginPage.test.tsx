import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '@/auth/auth-context'
import { ApiError } from '@/lib/api'
import { LoginPage } from './LoginPage'

function renderLogin(login: AuthState['login']) {
  const value: AuthState = { status: 'anonymous', user: null, login, logout: async () => {}, reloadUser: async () => {} }
  const router = createMemoryRouter([{ path: '/login', element: <LoginPage /> }, { path: '/dashboard', element: <p>Dashboard</p> }], { initialEntries: ['/login'] })
  render(<AuthContext.Provider value={value}><RouterProvider router={router} /></AuthContext.Provider>)
}

describe('LoginPage', () => {
  it('should show field errors and not call the API when the form is empty', async () => {
    const login = vi.fn()
    renderLogin(login)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(login).not.toHaveBeenCalled()
  })

  it('should show the server message on failure', async () => {
    renderLogin(vi.fn().mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.')))
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is incorrect.')
  })

  it('should go to the dashboard after signing in', async () => {
    renderLogin(vi.fn().mockResolvedValue({ id: '1', name: 'A', email: 'a@example.com', role: 'user', isEmailVerified: true }))
    await userEvent.type(screen.getByLabelText('Email'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'right-password-1')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })
})
