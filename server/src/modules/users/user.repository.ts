import type { Types } from 'mongoose';
import { escapeRegExp } from '../../lib/strings.js';
import { skipFor, type PaginationQuery } from '../../lib/pagination.js';
import { UserModel, type UserRole } from '../../models/user.model.js';

/** The only module that queries the `users` collection. */
export const userRepository = {
  findById(id: string | Types.ObjectId) {
    return UserModel.findById(id).lean();
  },

  findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() }).lean();
  },

  findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash').lean();
  },

  existsByEmail(email: string) {
    return UserModel.exists({ email: email.toLowerCase() });
  },

  create(data: { name: string; email: string; passwordHash: string; role?: UserRole; emailVerifiedAt?: Date | null }) {
    return UserModel.create(data);
  },

  markEmailVerified(id: Types.ObjectId | string) {
    return UserModel.updateOne({ _id: id, emailVerifiedAt: null }, { $set: { emailVerifiedAt: new Date() } });
  },

  updatePassword(id: Types.ObjectId | string, passwordHash: string) {
    return UserModel.updateOne({ _id: id }, { $set: { passwordHash } });
  },

  async search(query: PaginationQuery & { search?: string }) {
    const filter = query.search
      ? { $or: [{ name: new RegExp(escapeRegExp(query.search), 'i') }, { email: new RegExp(escapeRegExp(query.search), 'i') }] }
      : {};
    const [items, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
      UserModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  count() {
    return UserModel.countDocuments({ role: 'user' });
  },
};
