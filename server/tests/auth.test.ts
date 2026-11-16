import { describe, expect, it } from 'vitest';
import { TokenModel } from '../src/models/token.model.js';
import { UserModel } from '../src/models/user.model.js';
import { api, createUser, refreshSetCookie, flushBackgroundTasks, login, mailer, PASSWORD, tokenFromLastEmail, useTestDatabase } from './helpers.js';

useTestDatabase();

const register = (email: string, password = 'learning-path-7') => api().post('/api/v1/auth/register').send({ name: 'Ravi Kumar', email, password });

describe('auth flow', () => {
  it('should register, verify the email, log in, rotate the refresh token and log out', async () => {
    const email = 'ravi@example.com';
    await register(email).expect(202);
    await flushBackgroundTasks();

    const token = tokenFromLastEmail(email);
    expect(mailer.lastTo(email)?.subject).toContain('Confirm');
    await api().post('/api/v1/auth/verify-email').send({ token }).expect(200);
    // Single use.
    await api().post('/api/v1/auth/verify-email').send({ token }).expect(400);

    const session = await login(email, 'learning-path-7');
    expect(session.body.user).toMatchObject({ email, role: 'user', isEmailVerified: true });
    expect(session.body.user.passwordHash).toBeUndefined();

    const me = await api().get('/api/v1/me').set('Authorization', `Bearer ${session.accessToken}`).expect(200);
    expect(me.body.user.email).toBe(email);

    const refreshed = await api().post('/api/v1/auth/refresh').set('Cookie', session.cookie).expect(200);
    const rotatedCookie = refreshSetCookie(refreshed).split(';')[0]!;
    expect(rotatedCookie).not.toBe(session.cookie);
    expect(refreshed.body.accessToken).toBeTruthy();

    await api().post('/api/v1/auth/logout').set('Cookie', rotatedCookie).expect(204);
    await api().post('/api/v1/auth/refresh').set('Cookie', rotatedCookie).expect(401);
  });

  it('should store only hashes of refresh tokens and set a hardened cookie', async () => {
    const user = await createUser({ email: 'hash@example.com' });
    const response = await api().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD }).expect(200);
    const cookie = refreshSetCookie(response);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    const raw = cookie.split(';')[0]!.split('=')[1]!;
    expect(await TokenModel.countDocuments({ tokenHash: raw })).toBe(0);
    expect(await TokenModel.countDocuments({ type: 'refresh' })).toBe(1);
  });

  it('should revoke the whole session family when a rotated refresh token is reused', async () => {
    const user = await createUser({ email: 'reuse@example.com' });
    const session = await login(user.email);
    const first = await api().post('/api/v1/auth/refresh').set('Cookie', session.cookie).expect(200);
    const newCookie = refreshSetCookie(first).split(';')[0]!;

    const reuse = await api().post('/api/v1/auth/refresh').set('Cookie', session.cookie).expect(401);
    expect(reuse.body.error.code).toBe('REFRESH_TOKEN_REUSED');
    // The legitimate-looking descendant is revoked too.
    await api().post('/api/v1/auth/refresh').set('Cookie', newCookie).expect(401);
  });

  it('should give the same login error for an unknown email and a wrong password', async () => {
    await createUser({ email: 'known@example.com' });
    const unknown = await api().post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'whatever-123' }).expect(401);
    const wrong = await api().post('/api/v1/auth/login').send({ email: 'known@example.com', password: 'whatever-123' }).expect(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('should reject a weak password at registration', async () => {
    const response = await register('weak@example.com', 'short').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('should answer registration identically for a new and an existing email, and never create a duplicate', async () => {
    await createUser({ email: 'taken@example.com', name: 'Original Owner' });
    const fresh = await register('new@example.com').expect(202);
    const taken = await register('taken@example.com').expect(202);
    expect(taken.body).toEqual(fresh.body);
    expect(taken.headers['set-cookie']).toBeUndefined();

    await flushBackgroundTasks();
    expect(await UserModel.countDocuments({ email: 'taken@example.com' })).toBe(1);
    expect((await UserModel.findOne({ email: 'taken@example.com' }))?.name).toBe('Original Owner');
    expect(mailer.lastTo('taken@example.com')?.subject).toBe('You already have a Kalam account');
    expect(mailer.lastTo('new@example.com')?.subject).toContain('Confirm');
  });

  it('should never let registration create an admin', async () => {
    await api().post('/api/v1/auth/register').send({ name: 'Mallory', email: 'mallory@example.com', password: 'learning-path-7', role: 'admin' }).expect(202);
    await flushBackgroundTasks();
    expect((await UserModel.findOne({ email: 'mallory@example.com' }))?.role).toBe('user');
  });
});

describe('forgot and reset password', () => {
  it('should respond identically, before any lookup, whether the email exists or not', async () => {
    await createUser({ email: 'owner@example.com' });
    const known = await api().post('/api/v1/auth/forgot-password').send({ email: 'owner@example.com' }).expect(202);
    const unknown = await api().post('/api/v1/auth/forgot-password').send({ email: 'ghost@example.com' }).expect(202);
    expect(known.body).toEqual(unknown.body);
    // The response is sent before the email work starts: nothing has been sent yet.
    expect(mailer.messages).toHaveLength(0);
    await flushBackgroundTasks();
    expect(mailer.lastTo('owner@example.com')?.subject).toContain('Reset');
    expect(mailer.lastTo('ghost@example.com')).toBeUndefined();
  });

  it('should reset the password once and close every session', async () => {
    const user = await createUser({ email: 'reset@example.com' });
    const session = await login(user.email);
    await api().post('/api/v1/auth/forgot-password').send({ email: user.email }).expect(202);
    await flushBackgroundTasks();
    const token = tokenFromLastEmail(user.email);

    await api().post('/api/v1/auth/reset-password').send({ token, password: 'brand-new-pass-9' }).expect(200);
    await api().post('/api/v1/auth/reset-password').send({ token, password: 'another-pass-10' }).expect(400);
    await api().post('/api/v1/auth/refresh').set('Cookie', session.cookie).expect(401);
    await api().post('/api/v1/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
    await login(user.email, 'brand-new-pass-9');
  });
});
