import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { TeamRepository } from '../src/modules/teams/teams.repository';
import { MembershipRepository } from '../src/modules/memberships/memberships.repository';
import { AuditRepository } from '../src/modules/audit/audit.repository';
import { UserRepository } from '../src/modules/users/users.repository';
import { ApiKeyRepository } from '../src/modules/api-keys/api-keys.repository';
import { WebhookRepository } from '../src/modules/webhooks/webhooks.repository';

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

const mockTeams = createMockCollection();
const mockMemberships = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockUsers = createMockCollection();
const mockApiKeys = createMockCollection();
const mockWebhookDeliveries = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    teams: () => mockTeams,
    organizationMemberships: () => mockMemberships,
    auditLogs: () => mockAuditLogs,
    users: () => mockUsers,
    apiKeys: () => mockApiKeys,
    webhookDeliveries: () => mockWebhookDeliveries,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const teamId = new ObjectId().toHexString();
const membershipId = new ObjectId().toHexString();
const auditLogId = new ObjectId().toHexString();
const targetUserId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

describe('P21 Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Teams', () => {
    it('should include organizationId in findById query', async () => {
      mockTeams.findOne.mockResolvedValue({
        _id: new ObjectId(teamId),
        organizationId: new ObjectId(orgAId),
        name: 'Team A',
        description: null,
        memberIds: [],
        managerIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const repository = new TeamRepository();
      await repository.findById(teamId, orgAId);
      expect(mockTeams.findOne).toHaveBeenCalledWith({
        _id: new ObjectId(teamId),
        organizationId: new ObjectId(orgAId),
      });
    });

    it('should include organizationId in update query', async () => {
      mockTeams.findOne.mockResolvedValue({
        _id: new ObjectId(teamId),
        organizationId: new ObjectId(orgAId),
        name: 'Team A',
        description: null,
        memberIds: [],
        managerIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockTeams.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new TeamRepository();
      await repository.update(teamId, orgAId, { name: 'Updated Team' });
      expect(mockTeams.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(teamId), organizationId: new ObjectId(orgAId) },
        { $set: expect.objectContaining({ name: 'Updated Team' }) }
      );
    });

    it('should include organizationId in delete query', async () => {
      mockTeams.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const repository = new TeamRepository();
      await repository.delete(teamId, orgAId);
      expect(mockTeams.deleteOne).toHaveBeenCalledWith({
        _id: new ObjectId(teamId),
        organizationId: new ObjectId(orgAId),
      });
    });
  });

  describe('Memberships', () => {
    it('should include organizationId in findById query', async () => {
      mockMemberships.findOne.mockResolvedValue({
        _id: new ObjectId(membershipId),
        organizationId: new ObjectId(orgAId),
        userId: new ObjectId(userId),
        roleId: new ObjectId(roleId),
        teamIds: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const repository = new MembershipRepository();
      await repository.findById(membershipId, orgAId);
      expect(mockMemberships.findOne).toHaveBeenCalledWith({
        _id: new ObjectId(membershipId),
        organizationId: new ObjectId(orgAId),
      });
    });

    it('should include organizationId in update query', async () => {
      mockMemberships.findOne.mockResolvedValue({
        _id: new ObjectId(membershipId),
        organizationId: new ObjectId(orgAId),
        userId: new ObjectId(userId),
        roleId: new ObjectId(roleId),
        teamIds: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockMemberships.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new MembershipRepository();
      await repository.update(membershipId, orgAId, { status: 'suspended' });
      expect(mockMemberships.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(membershipId), organizationId: new ObjectId(orgAId) },
        { $set: expect.objectContaining({ status: 'suspended' }) }
      );
    });

    it('should include organizationId in remove query', async () => {
      mockMemberships.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new MembershipRepository();
      await repository.remove(membershipId, orgAId);
      expect(mockMemberships.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(membershipId), organizationId: new ObjectId(orgAId) },
        { $set: { status: 'removed', updatedAt: expect.any(Date) } }
      );
    });
  });

  describe('Audit Logs', () => {
    it('should include organizationId in findById query', async () => {
      mockAuditLogs.findOne.mockResolvedValue({
        _id: new ObjectId(auditLogId),
        organizationId: new ObjectId(orgAId),
        action: 'user.login',
        createdAt: new Date(),
      });

      const repository = new AuditRepository();
      await repository.findById(auditLogId, orgAId);
      expect(mockAuditLogs.findOne).toHaveBeenCalledWith({
        _id: new ObjectId(auditLogId),
        organizationId: new ObjectId(orgAId),
      });
    });
  });

  describe('Users', () => {
    it('should include organizationId in updatePassword query', async () => {
      mockUsers.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new UserRepository();
      await repository.updatePassword(targetUserId, orgAId, 'newhash');
      expect(mockUsers.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(targetUserId), organizationId: new ObjectId(orgAId) },
        { $set: { passwordHash: 'newhash', updatedAt: expect.any(Date) } }
      );
    });
  });

  describe('API Keys', () => {
    it('should include organizationId in updateLastUsed query', async () => {
      mockApiKeys.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new ApiKeyRepository();
      await repository.updateLastUsed(teamId, orgAId);
      expect(mockApiKeys.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(teamId), organizationId: new ObjectId(orgAId) },
        { $set: { lastUsedAt: expect.any(Date) } }
      );
    });
  });

  describe('Webhooks', () => {
    it('should include organizationId in updateDeliveryStatus query', async () => {
      mockWebhookDeliveries.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const repository = new WebhookRepository();
      await repository.updateDeliveryStatus(teamId, orgAId, { status: 'delivered' });
      expect(mockWebhookDeliveries.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(teamId), organizationId: new ObjectId(orgAId) },
        { $set: { status: 'delivered' } }
      );
    });
  });
});
