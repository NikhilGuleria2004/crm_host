import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ImportService, MAX_FILE_SIZE } from '../src/modules/imports/imports.service';
import type { ImportRepository } from '../src/modules/imports/imports.repository';

vi.mock('../src/storage/mongo-file-storage', () => ({
  fileStorage: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../src/queue', () => ({
  queue: {
    enqueue: vi.fn().mockResolvedValue('mock-job-id'),
  },
}));

function createMockRepository(): vi.Mocked<ImportRepository> {
  return {
    findById: vi.fn(),
    findByFileKey: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    toResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const importId = new ObjectId().toHexString();

const mockImportDoc = {
  _id: new ObjectId(importId),
  organizationId: new ObjectId(orgId),
  entity: 'contacts',
  fileKey: 'upload.csv',
  status: 'pending',
  totalRows: 100,
  processedRows: 0,
  createdCount: 0,
  updatedCount: 0,
  failedCount: 0,
  createdBy: new ObjectId(userId),
  createdAt: new Date('2026-01-01'),
};

describe('P26 ImportService', () => {
  let service: ImportService;
  let repository: vi.Mocked<ImportRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new ImportService(repository);
    repository.toResponse.mockImplementation((doc: any) => ({
      id: doc._id?.toHexString?.() || importId,
      entity: doc.entity,
      status: doc.status,
      totalRows: doc.totalRows,
      processedRows: doc.processedRows,
      createdCount: doc.createdCount,
      updatedCount: doc.updatedCount,
      failedCount: doc.failedCount,
      errorFileKey: doc.errorFileKey,
      createdAt: doc.createdAt?.toISOString?.() || '2026-01-01T00:00:00.000Z',
      completedAt: doc.completedAt?.toISOString?.(),
    }));
  });

  describe('list', () => {
    it('should return paginated import jobs', async () => {
      repository.list.mockResolvedValue({
        data: [mockImportDoc],
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
    it('should return an import job by id', async () => {
      repository.findById.mockResolvedValue(mockImportDoc);

      const result = await service.getById(importId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(importId, orgId);
      expect(result?.entity).toBe('contacts');
    });

    it('should return null if job not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(importId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('createJob', () => {
    it('should create an import job', async () => {
      repository.create.mockResolvedValue(mockImportDoc);
      repository.findByFileKey.mockResolvedValue(null);

      const result = await service.createJob(orgId, userId, 'contacts', {
        name: 'upload.csv',
        content: Buffer.from('First Name,Last Name,Email\nJohn,Doe,john@example.com'),
      });

      expect(repository.create).toHaveBeenCalledWith({
        organizationId: orgId,
        entity: 'contacts',
        fileKey: expect.any(String),
        totalRows: 1,
        createdBy: userId,
      });
      expect(result.entity).toBe('contacts');
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV content', () => {
      const result = service.parseCSV('First Name,Last Name,Email\nJohn,Doe,john@example.com');

      expect(result.headers).toEqual(['First Name', 'Last Name', 'Email']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({ 'First Name': 'John', 'Last Name': 'Doe', 'Email': 'john@example.com' });
    });

    it('should handle quoted values with commas', () => {
      const result = service.parseCSV('Name,Address\n"John, Doe","123 Main St, City"');

      expect(result.headers).toEqual(['Name', 'Address']);
      expect(result.rows[0]['Name']).toBe('John, Doe');
      expect(result.rows[0]['Address']).toBe('123 Main St, City');
    });

    it('should handle empty lines', () => {
      const result = service.parseCSV('Name,Email\nJohn,john@example.com\n\nJane,jane@example.com');

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('previewImport', () => {
    it('should return preview with headers and rows', async () => {
      repository.findById.mockResolvedValue(mockImportDoc);
      const mockFileStorage = await import('../src/storage/mongo-file-storage');
      mockFileStorage.fileStorage.get.mockResolvedValue({
        content: Buffer.from('First Name,Last Name,Email\nJohn,Doe,john@example.com'),
        contentType: 'text/csv',
      });

      const result = await service.previewImport(importId, orgId, {
        firstName: 'First Name',
        email: 'Email',
      });

      expect(result.headers).toContain('First Name');
      expect(result.headers).toContain('Email');
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should throw if job not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.previewImport(importId, orgId, {})).rejects.toThrow('Import job not found');
    });
  });

  describe('startImport', () => {
    it('should enqueue import processing and update status to processing', async () => {
      repository.findById.mockResolvedValue(mockImportDoc);
      repository.updateStatus.mockResolvedValue(undefined);
      const mockFileStorage = await import('../src/storage/mongo-file-storage');
      mockFileStorage.fileStorage.get.mockResolvedValue({
        content: Buffer.from('First Name,Last Name,Email\nJohn,Doe,john@example.com'),
        contentType: 'text/csv',
      });

      await service.startImport(importId, orgId, { firstName: 'First Name', email: 'Email' });

      expect(repository.updateStatus).toHaveBeenCalledWith(
        importId,
        orgId,
        expect.objectContaining({
          status: 'processing',
        })
      );
    });

    it('should throw if job not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.startImport(importId, orgId, {})).rejects.toThrow('Import job not found');
    });

    it('should throw if job is not pending', async () => {
      repository.findById.mockResolvedValue({ ...mockImportDoc, status: 'processing' });

      await expect(service.startImport(importId, orgId, {})).rejects.toThrow('Import job is not in pending state');
    });
  });
});
