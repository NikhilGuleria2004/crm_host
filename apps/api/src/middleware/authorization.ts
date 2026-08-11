import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';

interface PermissionAssignment {
  permission: string;
  scope: 'NONE' | 'OWN' | 'TEAM' | 'ORGANIZATION' | 'GLOBAL';
}

const rolePermissionCache = new Map<string, PermissionAssignment[]>();

export function clearRolePermissionCache(): void {
  rolePermissionCache.clear();
}

export function authorize(requiredPermission: string) {
  return async (c: any, next: any): Promise<void | Response> => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
        401
      );
    }

    if (user.status === 'suspended') {
      return c.json(
        { error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' } },
        403
      );
    }

    const organizationId = c.get('organizationId');
    if (!organizationId) {
      return c.json(
        { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
        403
      );
    }

    // Owner wildcard
    if (requiredPermission === '*') {
      c.set('permissions', [{ permission: '*', scope: 'GLOBAL' }]);
      return next();
    }

    // Use pre-computed permissions (e.g. from API key auth) if available
    let assignments: PermissionAssignment[] = c.get('permissions') || [];
    if (assignments.length === 0) {
      const cacheKey = user.roleIds.sort().join(',');
      const cached = rolePermissionCache.get(cacheKey);
      if (cached) {
        assignments = cached;
      } else {
        const rolePermissions = await collections.rolePermissions().find({
          roleId: { $in: user.roleIds.map((id: string) => new ObjectId(id)) },
        }).toArray();

        assignments = rolePermissions.map((rp) => ({
          permission: rp.permission,
          scope: rp.scope,
        }));
        rolePermissionCache.set(cacheKey, assignments);
      }
    }

    // Check exact permission
    const exactMatch = assignments.find((a) => a.permission === requiredPermission);
    if (exactMatch) {
      c.set('permissions', [exactMatch]);
      return next();
    }

    // Check resource wildcard (e.g., users.* for users.read)
    const [resource] = requiredPermission.split('.');
    const wildcardMatch = assignments.find((a) => a.permission === `${resource}.*`);
    if (wildcardMatch) {
      c.set('permissions', [wildcardMatch]);
      return next();
    }

    // Check global wildcard
    const globalMatch = assignments.find((a) => a.permission === '*');
    if (globalMatch) {
      c.set('permissions', [globalMatch]);
      return next();
    }

    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      403
    );
  };
}

export async function checkRecordScope(c: any, options: {
  resource: string;
  recordOwnerId?: string;
  recordTeamIds?: string[];
}): Promise<void | Response> {
  const user = c.get('user');
  const permissions: PermissionAssignment[] = c.get('permissions') || [];

  if (!user || !permissions.length) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      403
    );
  }

  const permission = permissions.find((p) =>
    p.permission === options.resource ||
    p.permission === '*' ||
    options.resource.startsWith(p.permission.replace('*', ''))
  );

  if (!permission) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      403
    );
  }

  const scope = permission.scope;

  if (scope === 'GLOBAL' || scope === 'ORGANIZATION') {
    return;
  }

  if (scope === 'NONE') {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
      403
    );
  }

  if (scope === 'OWN') {
    if (options.recordOwnerId && options.recordOwnerId === user.id) {
      return;
    }
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'You do not own this record' } },
      403
    );
  }

  if (scope === 'TEAM') {
    const userTeamIds = user.teamIds || [];
    const recordTeamIds = options.recordTeamIds || [];
    const hasAccess = recordTeamIds.some((teamId: string) => userTeamIds.includes(teamId));
    if (hasAccess) {
      return;
    }
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'You are not a member of the team that owns this record' } },
      403
    );
  }

  return c.json(
    { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
    403
  );
}
