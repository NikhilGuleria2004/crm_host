import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { PasswordResetTokenDocument } from '../../types/documents';

export class AuthRepository {
  async createPasswordResetToken(
    userId: string,
    organizationId: string,
    tokenHash: string,
    expiresAt: Date
  ): Promise<PasswordResetTokenDocument> {
    const now = new Date();
    const result = await collections.passwordResetTokens().insertOne({
      userId: new ObjectId(userId),
      organizationId: new ObjectId(organizationId),
      tokenHash,
      expiresAt,
      createdAt: now,
    } as any);

    const doc = await collections.passwordResetTokens().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create password reset token');
    return doc as PasswordResetTokenDocument;
  }

  async findValidPasswordResetToken(tokenHash: string): Promise<PasswordResetTokenDocument | null> {
    const doc = await collections
      .passwordResetTokens()
      .findOne({ tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    return doc as PasswordResetTokenDocument | null;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await collections.passwordResetTokens().updateOne(
      { _id: new ObjectId(id) },
      { $set: { usedAt: new Date() } }
    );
  }

  async revokeAllUserPasswordResetTokens(userId: string): Promise<void> {
    await collections.passwordResetTokens().updateMany(
      { userId: new ObjectId(userId), usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } }
    );
  }
}
