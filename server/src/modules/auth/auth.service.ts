import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { generateOpaqueToken, hashToken } from '../../lib/crypto.js';
import { signAccessToken } from '../../lib/jwt.js';
import { sendMailSafely } from '../../mail/index.js';
import { accountExistsEmail, passwordResetEmail, verificationEmail } from '../../mail/templates.js';
import { runInBackground } from '../../lib/background.js';
import { presentUser, type PublicUser } from '../users/user.presenter.js';
import { userRepository } from '../users/user.repository.js';
import { tokenRepository } from './token.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

const BCRYPT_COST = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 30 * 60 * 1000;
// Hash of a random string, compared against when the email is unknown so login takes the same time.
const DUMMY_HASH = bcrypt.hashSync(generateOpaqueToken(), BCRYPT_COST);

export interface Session {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

async function issueSession(user: Parameters<typeof presentUser>[0], family: string = randomUUID()): Promise<Session> {
  const refreshToken = generateOpaqueToken();
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await tokenRepository.create({ user: user._id, type: 'refresh', tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiresAt, family });
  return {
    user: presentUser(user),
    accessToken: signAccessToken({ sub: user._id.toString(), role: user.role }),
    refreshToken,
    refreshTokenExpiresAt,
  };
}

async function sendVerificationEmail(user: { _id: unknown; name: string; email: string }) {
  const token = generateOpaqueToken();
  await tokenRepository.deleteForUser(String(user._id), 'email_verification');
  await tokenRepository.create({
    user: String(user._id),
    type: 'email_verification',
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });
  const url = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendMailSafely(verificationEmail(user.email, user.name, url));
}

export const authService = {
  /**
   * Answers the same way whether the email is new or already registered: the work (hashing,
   * account creation, emails) runs after the response, so neither the body nor the timing
   * reveals which addresses have accounts. An existing owner receives an informative email.
   */
  register(input: RegisterInput): void {
    runInBackground('register', async () => {
      const existing = await userRepository.findByEmail(input.email);
      if (existing) {
        await sendMailSafely(accountExistsEmail(existing.email, existing.name, `${env.CLIENT_URL}/forgot-password`));
        return;
      }
      // Public registration always creates a learner: the role is never read from the request.
      const passwordHash = await hashPassword(input.password);
      try {
        const user = await userRepository.create({ name: input.name, email: input.email, passwordHash, role: 'user' });
        await sendVerificationEmail(user);
      } catch (error) {
        // Two simultaneous registrations for the same email: the unique index keeps one account.
        if ((error as { code?: number }).code === 11000) return;
        throw error;
      }
    });
  },

  async login(input: LoginInput): Promise<Session> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    const isValid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !isValid) {
      // Same message whether the email exists or not.
      throw AppError.unauthorized('INVALID_CREDENTIALS', 'The email or password is incorrect.');
    }
    return issueSession(user);
  },

  /**
   * Rotates the refresh token. A token that was already rotated being presented again means it
   * was stolen or replayed: the whole family (every descendant session) is revoked.
   */
  async refresh(refreshToken: string | undefined): Promise<Session> {
    if (!refreshToken) throw AppError.unauthorized('REFRESH_TOKEN_MISSING', 'Sign in to continue.');
    const tokenHash = hashToken(refreshToken);
    const consumed = await tokenRepository.consume(tokenHash, 'refresh');
    if (!consumed) {
      const existing = await tokenRepository.findByHash(tokenHash, 'refresh');
      if (existing?.usedAt && existing.family) {
        await tokenRepository.deleteFamily(existing.family);
        throw AppError.unauthorized('REFRESH_TOKEN_REUSED', 'Your session was closed for safety. Sign in again.');
      }
      throw AppError.unauthorized('REFRESH_TOKEN_INVALID', 'Your session has expired. Sign in again.');
    }
    const user = await userRepository.findById(consumed.user);
    if (!user) throw AppError.unauthorized('ACCOUNT_NOT_FOUND', 'This account no longer exists.');
    return issueSession(user, consumed.family ?? undefined);
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const existing = await tokenRepository.findByHash(hashToken(refreshToken), 'refresh');
    if (existing?.family) await tokenRepository.deleteFamily(existing.family);
  },

  async verifyEmail(token: string): Promise<void> {
    const consumed = await tokenRepository.consume(hashToken(token), 'email_verification');
    if (!consumed) throw AppError.badRequest('VERIFICATION_TOKEN_INVALID', 'This link is invalid or has expired. Request a new one from your dashboard.');
    await userRepository.markEmailVerified(consumed.user);
  },

  async resendVerification(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('ACCOUNT_NOT_FOUND', 'This account no longer exists.');
    if (user.emailVerifiedAt) throw AppError.conflict('ALREADY_VERIFIED', 'Your email is already confirmed.');
    await sendVerificationEmail(user);
  },

  /**
   * Returns immediately; the lookup, token creation and email run after the response, so the
   * response time is the same whether or not the email has an account.
   */
  requestPasswordReset(email: string): void {
    runInBackground('password reset request', async () => {
      const user = await userRepository.findByEmail(email);
      if (!user) return;
      const token = generateOpaqueToken();
      await tokenRepository.deleteForUser(user._id, 'password_reset');
      await tokenRepository.create({ user: user._id, type: 'password_reset', tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
      const url = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMailSafely(passwordResetEmail(user.email, user.name, url));
    });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const consumed = await tokenRepository.consume(hashToken(token), 'password_reset');
    if (!consumed) throw AppError.badRequest('RESET_TOKEN_INVALID', 'This link is invalid or has expired. Ask for a new one.');
    await userRepository.updatePassword(consumed.user, await hashPassword(password));
    // Following an emailed link proves ownership of the address.
    await userRepository.markEmailVerified(consumed.user);
    // A password change closes every open session, including a possibly compromised one.
    await tokenRepository.deleteForUser(consumed.user, 'refresh');
  },

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized('ACCOUNT_NOT_FOUND', 'This account no longer exists.');
    return presentUser(user);
  },
};
