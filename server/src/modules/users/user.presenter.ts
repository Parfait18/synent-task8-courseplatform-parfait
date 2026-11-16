import type { Types } from 'mongoose';
import type { UserRole } from '../../models/user.model.js';

interface UserLike {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  emailVerifiedAt?: Date | null;
  createdAt?: Date;
}

/** Public shape of a user. Never includes the password hash. */
export function presentUser(user: UserLike) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt?.toISOString(),
  };
}

export type PublicUser = ReturnType<typeof presentUser>;
