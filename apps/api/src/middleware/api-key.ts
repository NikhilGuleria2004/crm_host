import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';
import { ApiKeyService } from '../modules/api-keys/api-keys.service';
import { ApiKeyRepository } from '../modules/api-keys/api-keys.repository';

const apiKeyService = new ApiKeyService(new ApiKeyRepository());

interface PermissionAssignment {
  permission: string;
  scope: 'NONE' | 'OWN' | 'TEAM' | 'ORGANIZATION' | 'GLOBAL';
}

export async function authenticateApiKey(c: any, next: any): Promise<void | Response> {
  const authHeader = c.req.header('Authorization');
  const apiKeyHeader = c.req.header('X-API-Key');

  let rawKey: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    rawKey = apiKeyHeader;
  }

  if (!rawKey) {
    c.set('apiKeyUser', null);
    c.set('apiKeyOrganizationId', null);
    c.set('apiKeyPermissions', null);
    return next();
  }

  const doc = await apiKeyService.validateKey(rawKey);
  if (!doc) {
    return c.json(
      { error: { code: 'INVALID_API_KEY', message: 'Invalid or expired API key' } },
      401
    );
  }

  const user = await collections.users().findOne({ _id: doc.createdBy });
  if (!user || user.status === 'suspended' || user.status === 'deactivated') {
    return c.json(
      { error: { code: 'API_KEY_OWNER_INACTIVE', message: 'API key owner is inactive' } },
      401
    );
  }

  const rolePermissions = await collections.rolePermissions().find({
    roleId: { $in: user.roleIds },
  }).toArray();

  const userPermissions: PermissionAssignment[] = rolePermissions.map((rp) => ({
    permission: rp.permission,
    scope: rp.scope,
  }));

  const keyScopes = doc.scopes || [];
  const effectivePermissions = userPermissions.filter((up) =>
    keyScopes.some((ks) => up.permission === ks || ks === '*' || up.permission.startsWith(ks.replace('*', '')))
  );

  c.set('apiKeyUser', {
    id: user._id.toHexString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roleIds: user.roleIds.map((id: ObjectId) => id.toHexString()),
    teamIds: user.teamIds.map((id: ObjectId) => id.toHexString()),
    organizationId: doc.organizationId.toHexString(),
    apiKeyId: doc._id.toHexString(),
  });
  c.set('apiKeyOrganizationId', doc.organizationId.toHexString());
  c.set('apiKeyPermissions', effectivePermissions);

  return next();
}

export function requireApiKey(c: any, next: any) {
  const user = c.get('apiKeyUser');
  if (!user) {
    return c.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'API key required' } },
      401
    );
  }
  return next();
}
