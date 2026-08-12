import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ExportService } from '../src/modules/exports/exports.service';
import type { ExportRepository } from '../src/modules/exports/exports.repository';

vi.mock('../src/storage/factory', () => ({
  fileStorage: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../src/queue/factory', () => ({
  createQueue: () => ({
    enqueue: vi.fn().mockResolvedValue('mock-job-id'),
  }),
}));

function createMockRepository(): vi.Mocked<ExportRepository> {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    toResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const exportId = new ObjectId().toHexString();

const mockExportDoc = {
  _id: new ObjectId(exportId),
  organizationId: new ObjectId(orgId),
  entity: 'contacts',
  filters: {},
  fields: ['firstName', 'lastName', 'email'],
  status: 'completed' as const,
  fileKey: 'exports/test.csv',
  totalRows: 5,
  createdBy: new ObjectId(userId),
  createdAt: new Date('2026-01-01'),
  completedAt: new Date('2026-01-01'),
};

describe('P27 ExportService', () => {
  let service: ExportService;
  let repository: vi.Mocked<ExportRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new ExportService(repository);
    repository.toResponse.mockImplementation((doc: any) => ({
      id: doc._id?.toHexString?.() || exportId,
      entity: doc.entity,
      status: doc.status,
      totalRows: doc.totalRows,
      fileKey: doc.fileKey,
      downloadUrl: doc.fileKey ? `/api/v1/exports/${doc._id.toHexString()}/download` : undefined,
      createdBy: doc.createdBy.toHexString(),
      createdAt: doc.createdAt?.toISOString?.() || '2026-01-01T00:00:00.000Z',
      completedAt: doc.completedAt?.toISOString?.(),
    }));
  });

  describe('list', () => {
    it('should return paginated export jobs', async () => {
      repository.list.mockResolvedValue({
        data: [mockExportDoc],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.list(orgId, { limit: 20 });

      expect(repository.list).toHaveBeenCalledWith(orgId, {
        limit: 20,
        cursor: undefined,
        entity: undefined,
        status: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].entity).toBe('contacts');
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('getById', () => {
    it('should return export job by id', async () => {
      repository.findById.mockResolvedValue(mockExportDoc);

      const result = await service.getById(exportId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(exportId, orgId);
      expect(result?.entity).toBe('contacts');
      expect(result?.status).toBe('completed');
    });

    it('should return null if job not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(exportId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('createJob', () => {
    it('should create export job and enqueue it', async () => {
      const createdDoc = {
        ...mockExportDoc,
        status: 'pending' as const,
        fileKey: undefined,
        totalRows: undefined,
        completedAt: undefined,
      };
      repository.create.mockResolvedValue(createdDoc);
      repository.findById.mockResolvedValue(createdDoc);

      const result = await service.createJob(orgId, userId, 'contacts', ['firstName', 'email'], {});

      expect(repository.create).toHaveBeenCalled();
      expect(result.status).toBe('pending');
    });
  });

  describe('processExport', () => {
    it('should process export and update job status', async () => {
      const pendingDoc = {
        ...mockExportDoc,
        status: 'pending' as const,
        fileKey: undefined,
        totalRows: undefined,
        completedAt: undefined,
      };
      repository.findById.mockResolvedValue(pendingDoc);
      repository.updateStatus.mockResolvedValue(undefined);

      await service.processExport({ jobId: exportId, organizationId: orgId, entity: 'contacts', fields: ['firstName', 'email'] });

      expect(repository.updateStatus).toHaveBeenCalledWith(
        exportId,
        orgId,
        expect.objectContaining({
          status: 'completed',
          totalRows: 5,
        })
      );
    });
  });
});
