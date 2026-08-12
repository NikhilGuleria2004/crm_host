import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { TeamDocument } from '../../types/documents';
import type { TeamResponse, CreateTeamInput, UpdateTeamInput } from './teams.types';

function toResponse(doc: TeamDocument): TeamResponse {
  return {
    id: doc._id.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    name: doc.name,
    description: doc.description,
    memberIds: doc.memberIds.map((id) => id.toHexString()),
    managerIds: doc.managerIds.map((id) => id.toHexString()),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class TeamRepository {
  async findById(id: string, organizationId: string): Promise<TeamDocument | null> {
    const doc = await collections.teams().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as TeamDocument | null;
  }

  async findByOrganization(organizationId: string): Promise<TeamDocument[]> {
    const docs = await collections.teams().find({ organizationId: new ObjectId(organizationId) }).toArray();
    return docs as TeamDocument[];
  }

  async create(input: CreateTeamInput & { organizationId: string }): Promise<TeamDocument> {
    const now = new Date();
    const result = await collections.teams().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      description: input.description,
      memberIds: input.memberIds?.map((id) => new ObjectId(id)) || [],
      managerIds: input.managerIds?.map((id) => new ObjectId(id)) || [],
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.teams().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create team');
    return doc as TeamDocument;
  }

  async update(id: string, organizationId: string, input: UpdateTeamInput): Promise<TeamDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.memberIds !== undefined) update.memberIds = input.memberIds.map((id) => new ObjectId(id));
    if (input.managerIds !== undefined) update.managerIds = input.managerIds.map((id) => new ObjectId(id));

    await collections.teams().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );
    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await collections.teams().deleteOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
  }

  toResponse(doc: TeamDocument | null): TeamResponse | null {
    if (!doc) return null;
    return toResponse(doc);
  }
}
