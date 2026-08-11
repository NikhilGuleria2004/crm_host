import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRecordScope } from '../src/middleware/authorization';

describe('P11 RBAC Engine', () => {
  describe('checkRecordScope', () => {
    it('should allow ORGANIZATION scope', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: [] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: 'contacts.read', scope: 'ORGANIZATION' }];
      
      const result = await checkRecordScope(c, { resource: 'contacts.read' });
      expect(result).toBeUndefined();
    });

    it('should allow GLOBAL scope', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: [] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: '*', scope: 'GLOBAL' }];
      
      const result = await checkRecordScope(c, { resource: 'anything' });
      expect(result).toBeUndefined();
    });

    it('should deny NONE scope', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: [] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: 'contacts.delete', scope: 'NONE' }];
      
      const result = await checkRecordScope(c, { resource: 'contacts.delete' });
      expect(c.json).toHaveBeenCalledWith(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    });

    it('should allow OWN scope when owner matches', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: [] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: 'deals.update', scope: 'OWN' }];
      
      const result = await checkRecordScope(c, {
        resource: 'deals.update',
        recordOwnerId: 'user1',
      });
      expect(result).toBeUndefined();
    });

    it('should deny OWN scope when owner does not match', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: [] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: 'deals.update', scope: 'OWN' }];
      
      const result = await checkRecordScope(c, {
        resource: 'deals.update',
        recordOwnerId: 'user2',
      });
      expect(c.json).toHaveBeenCalledWith(
        { error: { code: 'FORBIDDEN', message: 'You do not own this record' } },
        403
      );
    });

    it('should allow TEAM scope when user is in record team', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: ['team1'] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: 'contacts.update', scope: 'TEAM' }];
      
      const result = await checkRecordScope(c, {
        resource: 'contacts.update',
        recordTeamIds: ['team1'],
      });
      expect(result).toBeUndefined();
    });

    it('should deny TEAM scope when user is not in record team', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: ['team1'] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [{ permission: 'contacts.update', scope: 'TEAM' }];
      
      const result = await checkRecordScope(c, {
        resource: 'contacts.update',
        recordTeamIds: ['team2'],
      });
      expect(c.json).toHaveBeenCalledWith(
        { error: { code: 'FORBIDDEN', message: 'You are not a member of the team that owns this record' } },
        403
      );
    });

    it('should deny when no permissions set', async () => {
      const c: any = {
        user: { id: 'user1', teamIds: [] },
        get: vi.fn((key: string) => c[key]),
        json: vi.fn((data, status) => ({ data, status })),
      };
      c.permissions = [];
      
      const result = await checkRecordScope(c, { resource: 'contacts.read' });
      expect(c.json).toHaveBeenCalledWith(
        { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        403
      );
    });
  });
});
