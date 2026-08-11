import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { SessionDocument } from '../../types/documents';
import type { SessionResponse, CreateSessionInput } from './sessions.types';

function toResponse(doc: SessionDocument | null): SessionResponse | null {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    ipAddress: doc.ipAddress,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt.toISOString(),
    lastUsedAt: doc.lastUsedAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
  };
}

export class SessionRepository {
  async findById(id: string): Promise<SessionDocument | null> {
    const doc = await collections.sessions().findOne({ _id: new ObjectId(id) });
    return doc as SessionDocument | null;
  }

  async findByUserId(userId: string): Promise<SessionDocument[]> {
    const docs = await collections.sessions().find({ userId: new ObjectId(userId) }).toArray();
    return docs as SessionDocument[];
  }

  async create(input: CreateSessionInput & { tokenHash: string }): Promise<SessionDocument> {
    const now = new Date();
    const result = await collections.sessions().insertOne({
      userId: new ObjectId(input.userId),
      organizationId: new ObjectId(input.organizationId),
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: now,
      lastUsedAt: now,
    } as any);

    const doc = await collections.sessions().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create session');
    return doc as SessionDocument;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await collections.sessions().updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
  }

  async revoke(id: string): Promise<void> {
    await collections.sessions().updateOne({ _id: new ObjectId(id) }, { $set: { revokedAt: new Date() } });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await collections.sessions().updateMany(
      { userId: new ObjectId(userId) },
      { $set: { revokedAt: new Date() } }
    );
  }

  async revokeAllUserSessionsExcept(userId: string, sessionId: string): Promise<void> {
    await collections.sessions().updateMany(
      { userId: new ObjectId(userId), _id: { $ne: new ObjectId(sessionId) } },
      { $set: { revokedAt: new Date() } }
    );
  }

  toResponse(doc: SessionDocument | null): SessionResponse | null {
    return toResponse(doc);
  }
}
