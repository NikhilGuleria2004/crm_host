import { ObjectId } from 'mongodb';
import { ActivityRepository } from './activities.repository';
import type { CreateActivityInput, UpdateActivityInput, ActivityResponse, ActivityListResponse, ActivityListQuery } from './activities.types';
import { auditLog } from '../../middleware/audit';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class ActivityService {
  constructor(private repository: ActivityRepository) {}

  async list(organizationId: string, params: ActivityListQuery): Promise<ActivityListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      type: params.type,
      ownerId: params.ownerId,
      contactId: params.contactId,
      companyId: params.companyId,
      leadId: params.leadId,
      dealId: params.dealId,
      from: params.from,
      to: params.to,
      sort,
      direction,
    });

    const ownerIds = result.data.map((doc) => doc.ownerId).filter((id): id is ObjectId => id !== undefined && id !== null);
    const ownerNames = ownerIds.length > 0 ? await this.repository.getUserNames(ownerIds) : new Map();

    const data = result.data.map((doc) => {
      const ownerName = doc.ownerId ? ownerNames.get(doc.ownerId.toHexString()) : undefined;
      return this.repository.toResponse(doc, ownerName);
    });

    const filteredData = data.filter((activity): activity is ActivityResponse => activity !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateActivityInput): Promise<ActivityResponse> {
    const activity = await this.repository.create({
      organizationId,
      type: input.type,
      subject: input.subject,
      description: input.description || undefined,
      occurredAt: new Date(input.occurredAt),
      durationMinutes: input.durationMinutes || undefined,
      ownerId: toObjectId(input.ownerId) || new ObjectId(userId),
      contactId: toObjectId(input.contactId),
      companyId: toObjectId(input.companyId),
      leadId: toObjectId(input.leadId),
      dealId: toObjectId(input.dealId),
      metadata: input.metadata || {},
      createdBy: new ObjectId(userId),
    });

    const ownerName = activity.ownerId ? await this.repository.getUserName(activity.ownerId) : undefined;
    return this.repository.toResponse(activity, ownerName)!;
  }

  async getById(id: string, organizationId: string): Promise<ActivityResponse | null> {
    const activity = await this.repository.findById(id, organizationId);
    if (!activity) return null;

    const ownerName = activity.ownerId ? await this.repository.getUserName(activity.ownerId) : undefined;
    return this.repository.toDetailResponse(activity, ownerName);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateActivityInput): Promise<ActivityResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const activity = await this.repository.update(id, organizationId, {
      ...input,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      contactId: toObjectId(input.contactId),
      companyId: toObjectId(input.companyId),
      leadId: toObjectId(input.leadId),
      dealId: toObjectId(input.dealId),
      updatedBy: new ObjectId(userId),
    });

    if (!activity) return null;

    const ownerName = activity.ownerId ? await this.repository.getUserName(activity.ownerId) : undefined;
    return this.repository.toResponse(activity, ownerName);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Activity not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'activity.deleted',
      entityType: 'activity',
      entityId: id,
      before: {
        subject: existing.subject,
        type: existing.type,
      },
    });
  }

  async bulkDelete(ids: string[], organizationId: string, c: any): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const existing = await this.repository.findById(id, organizationId);
        if (!existing) {
          failed++;
          continue;
        }

        await this.repository.softDelete(id, organizationId);

        await auditLog(c, {
          action: 'activity.deleted',
          entityType: 'activity',
          entityId: id,
          before: {
            subject: existing.subject,
            type: existing.type,
          },
        });

        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }
}
