import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { UserDocument } from '../../types/documents';
import type { UserResponse, UpdateUserInput } from './users.types';

function toResponse(doc: UserDocument | null): UserResponse | null {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    avatarUrl: doc.avatarUrl,
    status: doc.status,
    roleIds: doc.roleIds.map((id) => id.toHexString()),
    teamIds: doc.teamIds.map((id) => id.toHexString()),
    lastLoginAt: doc.lastLoginAt?.toISOString(),
    preferences: doc.preferences,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface CreateUserPayload {
  organizationId: string;
  email: string;
  emailNormalized: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  status?: string;
  roleIds: string[];
  teamIds: string[];
}

export class UserRepository {
  async findById(id: string, organizationId?: string): Promise<UserDocument | null> {
    const query: Record<string, unknown> = { _id: new ObjectId(id) };
    if (organizationId) {
      query.organizationId = new ObjectId(organizationId);
    }
    const doc = await collections.users().findOne(query);
    return doc as UserDocument | null;
  }

  async findByEmail(organizationId: string, emailNormalized: string): Promise<UserDocument | null> {
    const doc = await collections
      .users()
      .findOne({ organizationId: new ObjectId(organizationId), emailNormalized });
    return doc as UserDocument | null;
  }

  async findByEmailNormalized(emailNormalized: string): Promise<UserDocument | null> {
    const doc = await collections.users().findOne({ emailNormalized });
    return doc as UserDocument | null;
  }

  async findByOrganizationId(organizationId: string): Promise<UserDocument[]> {
    const docs = await collections.users().find({ organizationId: new ObjectId(organizationId) }).toArray();
    return docs as UserDocument[];
  }

  async create(input: CreateUserPayload): Promise<UserDocument> {
    const now = new Date();
    const result = await collections.users().insertOne({
      organizationId: new ObjectId(input.organizationId),
      email: input.email,
      emailNormalized: input.emailNormalized,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      status: (input.status as 'invited' | 'active' | 'suspended' | 'deactivated') || 'invited',
      roleIds: input.roleIds.map((id) => new ObjectId(id)),
      teamIds: input.teamIds.map((id) => new ObjectId(id)),
      preferences: {},
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.users().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create user');
    return doc as UserDocument;
  }

  async update(id: string, organizationId: string, input: UpdateUserInput): Promise<UserDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.roleIds !== undefined) update.roleIds = input.roleIds.map((id) => new ObjectId(id));
    if (input.teamIds !== undefined) update.teamIds = input.teamIds.map((id) => new ObjectId(id));
    if (input.status !== undefined) update.status = input.status;

    const result = await collections.users().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );
    if (result.modifiedCount === 0) {
      return null;
    }
    return this.findById(id);
  }

  async updatePassword(id: string, organizationId: string, passwordHash: string): Promise<void> {
    await collections.users().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { passwordHash, updatedAt: new Date() } }
    );
  }

  toResponse(doc: UserDocument | null): UserResponse | null {
    return toResponse(doc);
  }
}
