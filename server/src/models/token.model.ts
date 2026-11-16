import { Schema, Types, model, type InferSchemaType } from 'mongoose';

export const TOKEN_TYPES = ['refresh', 'email_verification', 'password_reset'] as const;
export type TokenType = (typeof TOKEN_TYPES)[number];

/**
 * Secret tokens (refresh, email verification, password reset). Only SHA-256 hashes are stored.
 * The TTL index lets MongoDB delete expired tokens on its own.
 */
const tokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: TOKEN_TYPES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, default: null, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type Token = InferSchemaType<typeof tokenSchema> & { _id: Types.ObjectId };
export const TokenModel = model('Token', tokenSchema);
