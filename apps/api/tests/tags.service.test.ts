import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { TagService } from '../src/modules/tags/tags.service';
import type { TagRepository } from '../src/modules/tags/tags.repository';

function createMockRepository(): vi.Mocked<TagRepository> {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    removeTagFromRecords: vi.fn(),
    toResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const tagId = new ObjectId().toHexString();

const mockTagDoc = {
  _id: new ObjectId(tagId),
  organizationId: new ObjectId(orgId),
  name: 'Enterprise',
  normalizedName: 'enterprise',
  createdAt: new Date('2026-01-01'),
};

describe('P29 TagService', () => {
  let service: TagService;
  let repository: vi.Mocked<TagRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new TagService(repository);
    repository.toResponse.mockImplementation((doc: any) => ({
      id: doc._id?.toHexString?.() || tagId,
      organizationId: doc.organizationId?.toHexString?.() || orgId,
      name: doc.name,
      normalizedName: doc.normalizedName,
      createdAt: doc.createdAt?.toISOString?.() || '2026-01-01T00:00:00.000Z',
    }));
  });

  describe('list', () => {
    it('should return paginated tags', async () => {
      repository.list.mockResolvedValue({
        data: [mockTagDoc],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.list(orgId, { limit: 20 });

      expect(repository.list).toHaveBeenCalledWith(orgId, {
        limit: 20,
        cursor: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Enterprise');
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('getById', () => {
    it('should return tag by id', async () => {
      repository.findById.mockResolvedValue(mockTagDoc);

      const result = await service.getById(tagId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(tagId, orgId);
      expect(result?.name).toBe('Enterprise');
    });

    it('should return null if tag not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(tagId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a tag with normalized name', async () => {
      repository.create.mockResolvedValue(mockTagDoc);

      const result = await service.create(orgId, 'Enterprise');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          name: 'Enterprise',
          normalizedName: 'enterprise',
        })
      );
      expect(result.name).toBe('Enterprise');
      expect(result.normalizedName).toBe('enterprise');
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      repository.update.mockResolvedValue({
        ...mockTagDoc,
        name: 'Updated Tag',
        normalizedName: 'updated tag',
      });

      const result = await service.update(tagId, orgId, { name: 'Updated Tag' });

      expect(repository.update).toHaveBeenCalledWith(tagId, orgId, {
        name: 'Updated Tag',
        normalizedName: 'updated tag',
      });
      expect(result?.name).toBe('Updated Tag');
    });

    it('should return null if tag not found', async () => {
      repository.update.mockResolvedValue(null);

      const result = await service.update(tagId, orgId, { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should remove tag from records then delete tag', async () => {
      repository.delete.mockResolvedValue(true);

      const result = await service.delete(tagId, orgId);

      expect(repository.removeTagFromRecords).toHaveBeenCalledWith(orgId, tagId);
      expect(repository.delete).toHaveBeenCalledWith(tagId, orgId);
      expect(result).toBe(true);
    });
  });
});
