import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const mockAuditLogsCollection = {
  findOne: vi.fn(),
  find: vi.fn(),
  insertOne: vi.fn(),
};

const mockRolePermissionsCollection = {
  find: vi.fn(),
};

vi.mock('../src/db/collections', () => ({
  collections: {
    auditLogs: () => mockAuditLogsCollection,
    rolePermissions: () => mockRolePermissionsCollection,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

import { auditLog } from '../src/middleware/audit';
import { createAuditRoutes } from '../src/modules/audit/audit.routes';
import { AuditService } from '../src/modules/audit/audit.service';
import { AuditRepository } from '../src/modules/audit/audit.repository';
import { Hono } from 'hono';

const validObjectId = new ObjectId().toHexString();

describe('P35 Audit Log UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogsCollection.insertOne.mockResolvedValue({ insertedId: { toHexString: () => validObjectId } } as any);
    mockAuditLogsCollection.findOne.mockResolvedValue({
      _id: { toHexString: () => validObjectId },
      organizationId: { toHexString: () => validObjectId },
      action: 'test.action',
      createdAt: new Date(),
    } as any);
    mockAuditLogsCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);
    mockRolePermissionsCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'audit_logs.read', scope: 'ORGANIZATION' }]),
    } as any);
  });

  describe('auditLog middleware', () => {
    it('should skip audit when no organization context', async () => {
      const c: any = {
        get: vi.fn((key: string) => null),
        req: {
          header: vi.fn(),
        },
      };
      
      await auditLog(c, { action: 'test.action' });
      
      expect(mockAuditLogsCollection.insertOne).not.toHaveBeenCalled();
    });

    it('should create audit log with organization context', async () => {
      const c: any = {
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return validObjectId;
          if (key === 'user') return { id: validObjectId };
          return null;
        }),
        req: {
          header: vi.fn((header: string) => {
            if (header === 'x-forwarded-for') return '127.0.0.1';
            if (header === 'user-agent') return 'test-agent';
            return undefined;
          }),
        },
      };
      
      await auditLog(c, {
        action: 'user.login',
        entityType: 'user',
        entityId: validObjectId,
        metadata: { email: 'test@example.com' },
      });
      
      expect(mockAuditLogsCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.login',
          entityType: 'user',
          metadata: { email: 'test@example.com' },
        })
      );
    });
  });

  describe('AuditService', () => {
    it('should log an action', async () => {
      const repository = new AuditRepository();
      const service = new AuditService(repository);
      
      const result = await service.log(validObjectId, { action: 'user.login' }, validObjectId, '127.0.0.1', 'test-agent');
      
      expect(result.action).toBe('user.login');
      expect(result.actorId).toBe(validObjectId);
    });

    it('should generate CSV', async () => {
      const service = new AuditService(new AuditRepository());
      const logs = [
        {
          id: validObjectId,
          organizationId: validObjectId,
          actorId: validObjectId,
          action: 'user.login',
          entityType: 'user',
          entityId: validObjectId,
          metadata: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test',
          createdAt: new Date().toISOString(),
        },
      ];
      const csv = service.generateCsv(logs);
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('user.login');
      expect(csv).toContain('127.0.0.1');
    });
  });

  describe('AuditRoutes', () => {
    it('should list audit logs', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('organizationId', validObjectId);
        c.set('user', { id: validObjectId, roleIds: [], teamIds: [] });
        c.set('permissions', [{ permission: 'audit_logs.read', scope: 'ORGANIZATION' }]);
        await next();
      });
      app.route('/audit-logs', createAuditRoutes());
      
      mockAuditLogsCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: { toHexString: () => validObjectId },
                organizationId: { toHexString: () => validObjectId },
                action: 'user.login',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);
      
      const res = await app.request('/audit-logs');
      expect(res.status).toBe(200);
    });

    it('should filter audit logs by action', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('organizationId', validObjectId);
        c.set('user', { id: validObjectId, roleIds: [], teamIds: [] });
        c.set('permissions', [{ permission: 'audit_logs.read', scope: 'ORGANIZATION' }]);
        await next();
      });
      app.route('/audit-logs', createAuditRoutes());
      
      mockAuditLogsCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: { toHexString: () => validObjectId },
                organizationId: { toHexString: () => validObjectId },
                action: 'user.login',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);
      
      const res = await app.request('/audit-logs?action=user.login');
      expect(res.status).toBe(200);
      expect(mockAuditLogsCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.login' })
      );
    });

    it('should export audit logs as CSV', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('organizationId', validObjectId);
        c.set('user', { id: validObjectId, roleIds: [], teamIds: [] });
        c.set('permissions', [{ permission: 'audit_logs.read', scope: 'ORGANIZATION' }]);
        await next();
      });
      app.route('/audit-logs', createAuditRoutes());
      
      mockAuditLogsCollection.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: { toHexString: () => validObjectId },
                organizationId: { toHexString: () => validObjectId },
                action: 'user.login',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);
      
      const res = await app.request('/audit-logs/export/csv');
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('Timestamp');
      expect(text).toContain('user.login');
    });

    it('should return 403 without audit_logs.read permission', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('organizationId', validObjectId);
        c.set('user', { id: validObjectId, roleIds: [], teamIds: [] });
        c.set('permissions', []);
        await next();
      });
      app.route('/audit-logs', createAuditRoutes());
      
      mockRolePermissionsCollection.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      
      const res = await app.request('/audit-logs');
      expect(res.status).toBe(403);
    });
  });
});
