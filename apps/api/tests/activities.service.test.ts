import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ActivityService } from '../src/modules/activities/activities.service';
import type { ActivityRepository } from '../src/modules/activities/activities.repository';
import type { CreateActivityInput, UpdateActivityInput, ActivityListQuery } from '../src/modules/activities/activities.types';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<ActivityRepository> {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIds: vi.fn(),
    getUserName: vi.fn(),
    getUserNames: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const activityId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();

const mockActivityDoc = {
  _id: new ObjectId(activityId),
  organizationId: new ObjectId(orgId),
  type: 'call',
  subject: 'Discovery call',
  description: 'Discussed requirements.',
  occurredAt: new Date('2026-08-07T10:00:00.000Z'),
  durationMinutes: 30,
  ownerId: new ObjectId(ownerId),
  contactId: new ObjectId(),
  companyId: undefined,
  leadId: undefined,
  dealId: undefined,
  metadata: {},
  createdBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('P15 ActivityService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: ActivityService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new ActivityService(repository);
  });

  describe('list', () => {
    it('should return paginated activities with resolved owner names', async () => {
      repository.list.mockResolvedValue({
        data: [mockActivityDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getUserNames.mockResolvedValue(new Map([[ownerId, 'John Doe']]));
      repository.toResponse.mockReturnValue({
        id: activityId,
        type: 'call',
        subject: 'Discovery call',
        description: 'Discussed requirements.',
        occurredAt: new Date('2026-08-07T10:00:00.000Z').toISOString(),
        durationMinutes: 30,
        owner: { id: ownerId, name: 'John Doe' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.list(orgId, { limit: 10, sort: 'createdAt', direction: 'desc' });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        limit: 10,
        sort: 'createdAt',
        direction: 'desc',
      }));
      expect(result.data).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('create', () => {
    it('should create an activity with owner from user id', async () => {
      repository.create.mockResolvedValue(mockActivityDoc as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toResponse.mockReturnValue({
        id: activityId,
        type: 'call',
        subject: 'Discovery call',
        occurredAt: new Date('2026-08-07T10:00:00.000Z').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: CreateActivityInput = {
        type: 'call',
        subject: 'Discovery call',
        description: 'Discussed requirements.',
        occurredAt: '2026-08-07T10:00:00.000Z',
        durationMinutes: 30,
      };

      const result = await service.create(orgId, userId, input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          subject: 'Discovery call',
          type: 'call',
        })
      );
      expect(result.subject).toBe('Discovery call');
    });
  });

  describe('getById', () => {
    it('should return activity when found', async () => {
      repository.findById.mockResolvedValue(mockActivityDoc as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toDetailResponse.mockReturnValue({
        id: activityId,
        type: 'call',
        subject: 'Discovery call',
        occurredAt: new Date('2026-08-07T10:00:00.000Z').toISOString(),
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getById(activityId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(activityId, orgId);
      expect(result?.createdBy).toBe(userId);
    });

    it('should return null when activity not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(activityId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update activity and return updated record', async () => {
      repository.findById.mockResolvedValue(mockActivityDoc as any);
      repository.update.mockResolvedValue({
        ...mockActivityDoc,
        subject: 'Updated call',
      } as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toResponse.mockReturnValue({
        id: activityId,
        type: 'call',
        subject: 'Updated call',
        occurredAt: new Date('2026-08-07T10:00:00.000Z').toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: UpdateActivityInput = {
        subject: 'Updated call',
      };

      const result = await service.update(activityId, orgId, userId, input);

      expect(repository.update).toHaveBeenCalledWith(
        activityId,
        orgId,
        expect.objectContaining({
          subject: 'Updated call',
        })
      );
      expect(result?.subject).toBe('Updated call');
    });

    it('should return null when activity not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(activityId, orgId, userId, {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete and create audit log', async () => {
      repository.findById.mockResolvedValue(mockActivityDoc as any);
      repository.softDelete.mockResolvedValue(undefined);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return orgId;
          if (key === 'user') return { id: userId };
          return null;
        }),
      } as any;

      await service.delete(activityId, orgId, mockCtx);

      expect(repository.softDelete).toHaveBeenCalledWith(activityId, orgId);
    });

    it('should throw when activity not found', async () => {
      repository.findById.mockResolvedValue(null);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn(() => null),
      } as any;

      await expect(service.delete(activityId, orgId, mockCtx)).rejects.toThrow('Activity not found');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple activities and track failures', async () => {
      repository.findById
        .mockResolvedValueOnce(mockActivityDoc as any)
        .mockResolvedValueOnce(null);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return orgId;
          if (key === 'user') return { id: userId };
          return null;
        }),
      } as any;

      const result = await service.bulkDelete([activityId, 'nonexistent'], orgId, mockCtx);

      expect(result.deleted).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
