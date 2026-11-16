import type { UserRole } from '../models/user.model.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` (or `optionalAuthenticate`) from a valid access token. */
      auth?: { userId: string; role: UserRole };
      /** Parsed and typed inputs, set by the `validate` middleware. */
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
