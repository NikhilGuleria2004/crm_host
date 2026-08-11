import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { UserService } from '../src/modules/users/users.service';
import { UserRepository } from '../src/modules/users/users.repository';

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

const mockUsers = createMockCollection();
const mockSessions = createMockCollection();
const mockAuditLogs = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    users: () => mockUsers,
    sessions: () => mockSessions,
    auditLogs: () => mockAuditLogs,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new UserRepository();
    service = new UserService(repository);
  });

  describe('create', () => {
    it('should create a user with hashed password', async () => {
      const orgId = new ObjectId().toHexString();

      mockUsers.findOne.mockResolvedValue(null);
      mockUsers.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockUsers.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        _id: new ObjectId(),
        organizationId: new ObjectId(orgId),
        email: 'test@example.com',
        emailNormalized: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.create(orgId, {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe('active');
    });

    it('should throw if email already exists', async () => {
      const orgId = new ObjectId().toHexString();
      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(),
        emailNormalized: 'test@example.com',
      } as any);

      await expect(
        service.create(orgId, {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: 'password123',
        })
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('invite', () => {
    it('should create an invited user', async () => {
      const orgId = new ObjectId().toHexString();

      mockUsers.findOne.mockResolvedValue(null);
      mockUsers.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockUsers.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        _id: new ObjectId(),
        organizationId: new ObjectId(orgId),
        email: 'invite@example.com',
        emailNormalized: 'invite@example.com',
        passwordHash: 'hash',
        firstName: 'Invited',
        lastName: 'User',
        status: 'invited',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.invite(orgId, {
        email: 'invite@example.com',
        firstName: 'Invited',
        lastName: 'User',
        roleIds: [],
      });

      expect(result.status).toBe('invited');
    });
  });

  describe('deactivate', () => {
    it('should deactivate user and revoke sessions', async () => {
      const userId = new ObjectId().toHexString();
      const orgId = new ObjectId().toHexString();

      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(userId),
        organizationId: new ObjectId(orgId),
        email: 'test@example.com',
        emailNormalized: 'test@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockUsers.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      mockSessions.updateMany.mockResolvedValue({ modifiedCount: 2 } as any);
      mockAuditLogs.insertOne.mockResolvedValue({ insertedId: new ObjectId() } as any);

      await service.deactivate(userId, orgId);

      expect(mockUsers.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(userId), organizationId: new ObjectId(orgId) },
        { $set: { status: 'deactivated', updatedAt: expect.any(Date) } }
      );
      expect(mockSessions.updateMany).toHaveBeenCalledWith(
        { userId: new ObjectId(userId), revokedAt: { $exists: false } },
        { $set: { revokedAt: expect.any(Date) } }
      );
      expect(mockAuditLogs.insertOne).toHaveBeenCalled();
    });
  });
});
