import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { OrganizationMembershipDocument } from '../../types/documents';
import type { OrganizationMembershipResponse, CreateMembershipInput, UpdateMembershipInput } from './memberships.types';
import { generateSessionToken, hashToken } from '../../utils/crypto';

function toResponse(doc: OrganizationMembershipDocument): OrganizationMembershipResponse {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    roleId: doc.roleId.toHexString(),
    teamIds: doc.teamIds.map((id) => id.toHexString()),
    status: doc.status,
    joinedAt: doc.joinedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class MembershipRepository {
  async findById(id: string): Promise<OrganizationMembershipDocument | null> {
    const doc = await collections.organizationMemberships().findOne({ _id: new ObjectId(id) });
    return doc as OrganizationMembershipDocument | null;
  }

  async findByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembershipDocument | null> {
    const doc = await collections.organizationMemberships().findOne({
      userId: new ObjectId(userId),
      organizationId: new ObjectId(organizationId),
    });
    return doc as OrganizationMembershipDocument | null;
  }

  async findByInvitationToken(tokenHash: string): Promise<OrganizationMembershipDocument | null> {
    const doc = await collections.organizationMemberships().findOne({
      invitationToken: tokenHash,
      status: 'invited',
    });
    return doc as OrganizationMembershipDocument | null;
  }

  async findByOrganization(organizationId: string): Promise<OrganizationMembershipDocument[]> {
    const docs = await collections.organizationMemberships().find({
      organizationId: new ObjectId(organizationId),
      status: { $ne: 'removed' },
    }).toArray();
    return docs as OrganizationMembershipDocument[];
  }

  async create(input: CreateMembershipInput & { organizationId: string; roleId: string; status?: string }): Promise<OrganizationMembershipDocument> {
    const now = new Date();
    const invitationToken = input.status === 'invited' ? hashToken(generateSessionToken()) : undefined;
    
    const result = await collections.organizationMemberships().insertOne({
      userId: new ObjectId(input.userId),
      organizationId: new ObjectId(input.organizationId),
      roleId: new ObjectId(input.roleId),
      teamIds: input.teamIds?.map((id) => new ObjectId(id)) || [],
      status: (input.status as 'invited' | 'active' | 'suspended' | 'removed') || 'active',
      invitationToken,
      joinedAt: input.status === 'invited' ? undefined : now,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.organizationMemberships().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create membership');
    return doc as OrganizationMembershipDocument;
  }

  async update(id: string, input: UpdateMembershipInput): Promise<OrganizationMembershipDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.roleId !== undefined) update.roleId = new ObjectId(input.roleId);
    if (input.teamIds !== undefined) update.teamIds = input.teamIds.map((id) => new ObjectId(id));
    if (input.status !== undefined) {
      update.status = input.status;
      if (input.status === 'active') {
        update.joinedAt = now;
        update.invitationToken = undefined;
      }
    }

    await collections.organizationMemberships().updateOne({ _id: new ObjectId(id) }, { $set: update });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await collections.organizationMemberships().updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'removed', updatedAt: new Date() } }
    );
  }

  toResponse(doc: OrganizationMembershipDocument | null): OrganizationMembershipResponse | null {
    if (!doc) return null;
    return toResponse(doc);
  }
}
