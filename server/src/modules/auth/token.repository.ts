import type { Types } from 'mongoose';
import { TokenModel, type TokenType } from '../../models/token.model.js';

export const tokenRepository = {
  create(data: { user: Types.ObjectId | string; type: TokenType; tokenHash: string; expiresAt: Date; family?: string | null }) {
    return TokenModel.create(data);
  },

  findByHash(tokenHash: string, type: TokenType) {
    return TokenModel.findOne({ tokenHash, type }).lean();
  },

  /**
   * Atomically marks an unused, unexpired token as used and returns it.
   * Two concurrent requests with the same token: only one gets a document back.
   */
  consume(tokenHash: string, type: TokenType) {
    return TokenModel.findOneAndUpdate(
      { tokenHash, type, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { returnDocument: 'after' },
    ).lean();
  },

  deleteFamily(family: string) {
    return TokenModel.deleteMany({ type: 'refresh', family });
  },

  deleteByHash(tokenHash: string) {
    return TokenModel.deleteOne({ tokenHash });
  },

  deleteForUser(user: Types.ObjectId | string, type: TokenType) {
    return TokenModel.deleteMany({ user, type });
  },
};
