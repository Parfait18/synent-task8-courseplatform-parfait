/**
 * Fetch wrapper for the Kalam API.
 * - The access token lives in memory only (never localStorage), so an XSS cannot read a stored token.
 * - The refresh token is an httpOnly cookie scoped to /api/v1/auth; `refreshSession` trades it for a
 *   new access token. Concurrent refreshes share one request (rotation would otherwise revoke them).
 * - On a 401, a request refreshes once and is replayed.
 */
import type { User } from './types'

const BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: { path: string; message: string }[]

  constructor(status: number, code: string, message: string, details?: { path: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

let accessToken: string | null = null
let refreshInFlight: Promise<Session | null> | null = null
const listeners = new Set<(session: Session | null) => void>()

export interface Session {
  user: User
  accessToken: string
}

export function onSessionChange(listener: (session: Session | null) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Non-secret hint that a refresh cookie probably exists, so anonymous visitors do not send a
 * refresh request (and get a 401) on every page load. It never holds a token.
 */
const SESSION_HINT = 'kalam:has-session'

export function hasSessionHint(): boolean {
  try {
    return window.localStorage.getItem(SESSION_HINT) === '1'
  } catch {
    // Storage can be blocked (private mode, policies): fall back to always trying the cookie.
    return true
  }
}

function writeSessionHint(isSignedIn: boolean) {
  try {
    if (isSignedIn) window.localStorage.setItem(SESSION_HINT, '1')
    else window.localStorage.removeItem(SESSION_HINT)
  } catch {
    // Storage blocked: the hint is an optimisation only, nothing to do.
  }
}

export function setSession(session: Session | null) {
  accessToken = session?.accessToken ?? null
  writeSessionHint(session !== null)
  listeners.forEach((listener) => listener(session))
}

export function getAccessToken() {
  return accessToken
}

async function parseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null)
  const error = body?.error
  return new ApiError(response.status, error?.code ?? 'HTTP_ERROR', error?.message ?? `Request failed (${response.status}).`, error?.details)
}

/** Returns the new session, or null when there is no valid refresh cookie. */
export function refreshSession(): Promise<Session | null> {
  refreshInFlight ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) {
        setSession(null)
        return null
      }
      const session = (await response.json()) as Session
      setSession(session)
      return session
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include',
    signal: options.signal,
  })

  if (response.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    const session = await refreshSession()
    if (session) return apiRequest<T>(path, options, true)
  }
  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}

/** Builds a query string, dropping empty values. */
export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}
