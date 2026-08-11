import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { CustomFieldService } from '../src/modules/custom-fields/custom-fields.service';
import type { CustomFieldRepository } from '../src/modules/custom-fields/custom-fields.repository';

function createMockRepository(): vi.Mocked<CustomFieldRepository> {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findByEntity: vi.fn(),
    toResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const fieldId = new ObjectId().toHexString();

const mockFieldDoc = {
  _id: new ObjectId(fieldId),
  organizationId: new ObjectId(orgId),
  entity: 'contact',
  key: 'customerTier',
  label: 'Customer Tier',
  type: 'select',
  required: false,
  options: ['Standard', 'Premium', 'Enterprise'],
  order: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('P28 CustomFieldService', () => {
  let service: CustomFieldService;
  let repository: vi.Mocked<CustomFieldRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new CustomFieldService(repository);
    repository.toResponse.mockImplementation((doc: any) => ({
      id: doc._id?.toHexString?.() || fieldId,
      organizationId: doc.organizationId?.toHexString?.() || orgId,
      entity: doc.entity,
      key: doc.key,
      label: doc.label,
      type: doc.type,
      required: doc.required,
      options: doc.options,
      order: doc.order,
      createdAt: doc.createdAt?.toISOString?.() || '2026-01-01T00:00:00.000Z',
      updatedAt: doc.updatedAt?.toISOString?.() || '2026-01-01T00:00:00.000Z',
    }));
  });

  describe('list', () => {
    it('should return paginated custom fields', async () => {
      repository.list.mockResolvedValue({
        data: [mockFieldDoc],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.list(orgId, { limit: 20 });

      expect(repository.list).toHaveBeenCalledWith(orgId, {
        limit: 20,
        cursor: undefined,
        entity: undefined,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].label).toBe('Customer Tier');
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by entity', async () => {
      repository.list.mockResolvedValue({
        data: [mockFieldDoc],
        nextCursor: null,
        hasMore: false,
      });

      await service.list(orgId, { limit: 20, entity: 'contact' });

      expect(repository.list).toHaveBeenCalledWith(orgId, {
        limit: 20,
        cursor: undefined,
        entity: 'contact',
      });
    });
  });

  describe('getById', () => {
    it('should return custom field by id', async () => {
      repository.findById.mockResolvedValue(mockFieldDoc);

      const result = await service.getById(fieldId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(fieldId, orgId);
      expect(result?.key).toBe('customerTier');
    });

    it('should return null if field not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(fieldId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a custom field with normalized key', async () => {
      repository.create.mockResolvedValue(mockFieldDoc);

      const result = await service.create(orgId, {
        entity: 'contact',
        key: 'Customer Tier',
        label: 'Customer Tier',
        type: 'select',
        required: false,
        options: ['Standard', 'Premium'],
        order: 1,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          key: 'customer_tier',
          label: 'Customer Tier',
          type: 'select',
        })
      );
      expect(result.key).toBe('customerTier');
    });
  });

  describe('update', () => {
    it('should update a custom field', async () => {
      repository.update.mockResolvedValue({
        ...mockFieldDoc,
        label: 'Updated Label',
      });

      const result = await service.update(fieldId, orgId, { label: 'Updated Label' });

      expect(repository.update).toHaveBeenCalledWith(fieldId, orgId, { label: 'Updated Label' });
      expect(result?.label).toBe('Updated Label');
    });

    it('should return null if field not found', async () => {
      repository.update.mockResolvedValue(null);

      const result = await service.update(fieldId, orgId, { label: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a custom field', async () => {
      repository.delete.mockResolvedValue(true);

      const result = await service.delete(fieldId, orgId);

      expect(repository.delete).toHaveBeenCalledWith(fieldId, orgId);
      expect(result).toBe(true);
    });

    it('should return false if field not found', async () => {
      repository.delete.mockResolvedValue(false);

      const result = await service.delete(fieldId, orgId);

      expect(result).toBe(false);
    });
  });

  describe('getFieldsForEntity', () => {
    it('should return fields for a specific entity', async () => {
      repository.findByEntity.mockResolvedValue([mockFieldDoc]);

      const result = await service.getFieldsForEntity(orgId, 'contact');

      expect(repository.findByEntity).toHaveBeenCalledWith(orgId, 'contact');
      expect(result).toHaveLength(1);
      expect(result[0].entity).toBe('contact');
    });
  });
});
