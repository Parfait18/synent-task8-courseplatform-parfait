import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, getAccessToken, setSession } from './api'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const user = { id: '1', name: 'A', email: 'a@example.com', role: 'user' as const, isEmailVerified: true }

describe('api client', () => {
  const fetchMock = vi.fn<typeof fetch>()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    setSession({ user, accessToken: 'old-token' })
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('should refresh once on a 401 and replay the request with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'ACCESS_TOKEN_INVALID', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { user, accessToken: 'new-token' }))
      .mockResolvedValueOnce(json(200, { ok: true }))

    await expect(api.get('/me')).resolves.toEqual({ ok: true })
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/v1/auth/refresh')
    expect((fetchMock.mock.calls[2]![1]!.headers as Record<string, string>).Authorization).toBe('Bearer new-token')
    expect(getAccessToken()).toBe('new-token')
  })

  it('should share one refresh between concurrent 401s', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) return json(200, { user, accessToken: 'fresh' })
      return getAccessToken() === 'fresh' ? json(200, { url }) : json(401, { error: { code: 'ACCESS_TOKEN_INVALID', message: 'expired' } })
    })
    setSession({ user, accessToken: 'stale' })
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1)
  })

  it('should surface the server error code and sign out when the refresh fails', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { error: { code: 'ACCESS_TOKEN_INVALID', message: 'expired' } }))
      .mockResolvedValueOnce(json(401, { error: { code: 'REFRESH_TOKEN_INVALID', message: 'Sign in again.' } }))
    const failure = (await api.get("/me").catch((error: unknown) => error)) as ApiError
    expect(failure).toBeInstanceOf(ApiError)
    expect(failure.code).toBe('ACCESS_TOKEN_INVALID')
    expect(getAccessToken()).toBeNull()
  })
})
