import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ApiKeyService } from '../src/modules/api-keys/api-keys.service';
import { ApiKeyRepository } from '../src/modules/api-keys/api-keys.repository';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  };
}

const mockApiKeys = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    apiKeys: () => mockApiKeys,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();

describe('P22 API Key Security', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('raw key handling', () => {
    it('should return raw key only on creation', async () => {
      const now = new Date();
      const insertedId = new ObjectId();

      mockApiKeys.insertOne.mockResolvedValue({ insertedId } as any);
      mockApiKeys.findOne.mockResolvedValueOnce({
        _id: insertedId,
        organizationId: new ObjectId(orgAId),
        name: 'Test Key',
        keyHash: 'hash',
        scopes: ['contacts.read'],
        createdBy: new ObjectId(userId),
        createdAt: now,
        updatedAt: now,
      });

      const repository = new ApiKeyRepository();
      const service = new ApiKeyService(repository);
      const result = await service.create(orgAId, userId, { name: 'Test Key', scopes: ['contacts.read'] });

      expect(result.key).toBeDefined();
      expect(result.key).toMatch(/^crm_live_[a-f0-9]+$/);
      expect(result.keyHash).toBeUndefined();
    });

    it('should not expose raw key in list response', async () => {
      const repository = new ApiKeyRepository();
      const response = repository.toResponse({
        _id: new ObjectId(),
        organizationId: new ObjectId(orgAId),
        name: 'Test Key',
        keyHash: 'secret-hash',
        scopes: ['contacts.read'],
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: undefined,
      });

      expect(response).not.toHaveProperty('key');
      expect(response).not.toHaveProperty('keyHash');
      expect(response.name).toBe('Test Key');
    });

    it('should store hash, not raw key', async () => {
      const rawKey = `crm_live_${Buffer.from('secret').toString('hex')}`;
      const keyHash = Buffer.from(rawKey).toString('hex');
      const insertedId = new ObjectId();

      mockApiKeys.insertOne.mockResolvedValue({ insertedId } as any);
      mockApiKeys.findOne.mockResolvedValueOnce({
        _id: insertedId,
        organizationId: new ObjectId(orgAId),
        name: 'Test Key',
        keyHash,
        scopes: ['contacts.read'],
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const repository = new ApiKeyRepository();
      await repository.create({
        organizationId: orgAId,
        name: 'Test Key',
        keyHash,
        scopes: ['contacts.read'],
        createdBy: userId,
      });

      expect(mockApiKeys.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          keyHash,
        })
      );
    });
  });

  describe('revocation', () => {
    it('should revoke key and prevent validation', async () => {
      const apiKeyId = new ObjectId().toHexString();
      const keyHash = 'test-hash';

      mockApiKeys.findOne.mockImplementation((query: any) => {
        if (query._id && query.organizationId && !query.revokedAt) {
          return Promise.resolve({
            _id: new ObjectId(apiKeyId),
            organizationId: new ObjectId(orgAId),
            name: 'Test Key',
            keyHash,
            scopes: ['contacts.read'],
            createdBy: new ObjectId(userId),
            createdAt: new Date(),
            updatedAt: new Date(),
            revokedAt: undefined,
          });
        }
        if (query.keyHash && query.revokedAt) {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      mockApiKeys.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new ApiKeyRepository();
      await repository.revoke(apiKeyId, orgAId);

      const service = new ApiKeyService(repository);
      const result = await service.validateKey(`crm_live_${Buffer.from('test').toString('hex')}`, orgAId);
      expect(result).toBeNull();
    });

    it('should not allow reusing revoked key', async () => {
      const keyHash = 'test-hash';

      mockApiKeys.findOne.mockImplementation((query: any) => {
        if (query.keyHash && query.revokedAt) {
          if (query.revokedAt.$exists === false) {
            return Promise.resolve(null);
          }
          return Promise.resolve({
            _id: new ObjectId(),
            organizationId: new ObjectId(orgAId),
            name: 'Test Key',
            keyHash,
            scopes: ['contacts.read'],
            createdBy: new ObjectId(userId),
            createdAt: new Date(),
            updatedAt: new Date(),
            revokedAt: new Date(),
          });
        }
        return Promise.resolve(null);
      });

      const service = new ApiKeyService(new ApiKeyRepository());
      const result = await service.validateKey(`crm_live_${Buffer.from('test').toString('hex')}`, orgAId);
      expect(result).toBeNull();
    });
  });

  describe('organization scoping', () => {
    it('should find key with organizationId filter', async () => {
      const keyHash = 'test-hash';
      mockApiKeys.findOne.mockResolvedValue({
        _id: new ObjectId(),
        organizationId: new ObjectId(orgAId),
        name: 'Test Key',
        keyHash,
        scopes: ['contacts.read'],
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const repository = new ApiKeyRepository();
      const result = await repository.findByKeyHash(keyHash, orgAId);

      expect(mockApiKeys.findOne).toHaveBeenCalledWith({
        keyHash,
        organizationId: new ObjectId(orgAId),
        revokedAt: { $exists: false },
      });
      expect(result).not.toBeNull();
    });

    it('should return null when organizationId does not match', async () => {
      const keyHash = 'test-hash';
      mockApiKeys.findOne.mockResolvedValue(null);

      const repository = new ApiKeyRepository();
      const result = await repository.findByKeyHash(keyHash, orgBId);

      expect(mockApiKeys.findOne).toHaveBeenCalledWith({
        keyHash,
        organizationId: new ObjectId(orgBId),
        revokedAt: { $exists: false },
      });
      expect(result).toBeNull();
    });
  });

  describe('permission scoping', () => {
    it('should filter user permissions by key scopes', async () => {
      const userPermissions = [
        { permission: 'contacts.read', scope: 'ORGANIZATION' as const },
        { permission: 'contacts.write', scope: 'ORGANIZATION' as const },
        { permission: 'deals.read', scope: 'ORGANIZATION' as const },
      ];

      const keyScopes = ['contacts.read'];
      const effectivePermissions = userPermissions.filter((up) =>
        keyScopes.some((ks) => up.permission === ks || ks === '*' || up.permission.startsWith(ks.replace('*', '')))
      );

      expect(effectivePermissions).toHaveLength(1);
      expect(effectivePermissions[0].permission).toBe('contacts.read');
    });

    it('should allow wildcard scope to access all permissions', async () => {
      const userPermissions = [
        { permission: 'contacts.read', scope: 'ORGANIZATION' as const },
        { permission: 'contacts.write', scope: 'ORGANIZATION' as const },
      ];

      const keyScopes = ['*'];
      const effectivePermissions = userPermissions.filter((up) =>
        keyScopes.some((ks) => up.permission === ks || ks === '*' || up.permission.startsWith(ks.replace('*', '')))
      );

      expect(effectivePermissions).toHaveLength(2);
    });

    it('should support resource wildcard scopes', async () => {
      const userPermissions = [
        { permission: 'contacts.read', scope: 'ORGANIZATION' as const },
        { permission: 'contacts.write', scope: 'ORGANIZATION' as const },
        { permission: 'deals.read', scope: 'ORGANIZATION' as const },
      ];

      const keyScopes = ['contacts.*'];
      const effectivePermissions = userPermissions.filter((up) =>
        keyScopes.some((ks) => up.permission === ks || ks === '*' || up.permission.startsWith(ks.replace('*', '')))
      );

      expect(effectivePermissions).toHaveLength(2);
      expect(effectivePermissions.map((p) => p.permission)).toEqual(['contacts.read', 'contacts.write']);
    });
  });
});
