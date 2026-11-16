import type { CookieOptions, Request, Response } from 'express';
import { isProduction } from '../../config/env.js';
import { input } from '../../middlewares/validate.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { authService, type Session } from './auth.service.js';

export const REFRESH_COOKIE = 'kalam_rt';

/** Scoped to the auth routes so the cookie is never sent with other API calls. */
const cookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api/v1/auth',
  expires,
});

function sendSession(res: Response, session: Session, status = 200) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, cookieOptions(session.refreshTokenExpiresAt));
  res.status(status).json({ user: session.user, accessToken: session.accessToken });
}

const readRefreshCookie = (req: Request): string | undefined => {
  const value = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
};

export const authController = {
  async register(req: Request, res: Response) {
    authService.register(input.body<RegisterInput>(req));
    res.status(202).json({ message: 'Check your inbox: we sent you a link to confirm your email, then you can sign in.' });
  },

  async login(req: Request, res: Response) {
    sendSession(res, await authService.login(input.body<LoginInput>(req)));
  },

  async refresh(req: Request, res: Response) {
    try {
      sendSession(res, await authService.refresh(readRefreshCookie(req)));
    } catch (error) {
      // A dead refresh token must not stay in the browser.
      res.clearCookie(REFRESH_COOKIE, cookieOptions());
      throw error;
    }
  },

  async logout(req: Request, res: Response) {
    await authService.logout(readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    res.status(204).end();
  },

  async verifyEmail(req: Request, res: Response) {
    await authService.verifyEmail(input.body<{ token: string }>(req).token);
    res.json({ message: 'Your email is confirmed.' });
  },

  async resendVerification(req: Request, res: Response) {
    await authService.resendVerification(req.auth!.userId);
    res.status(202).json({ message: 'A new confirmation link is on its way.' });
  },

  async forgotPassword(req: Request, res: Response) {
    authService.requestPasswordReset(input.body<{ email: string }>(req).email);
    res.status(202).json({ message: 'If an account uses this email, a reset link is on its way.' });
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = input.body<{ token: string; password: string }>(req);
    await authService.resetPassword(token, password);
    res.json({ message: 'Your password is changed. Sign in with the new one.' });
  },

  async me(req: Request, res: Response) {
    res.json({ user: await authService.getProfile(req.auth!.userId) });
  },
};
