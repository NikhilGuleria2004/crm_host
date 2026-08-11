import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';
import { hashToken } from '../utils/crypto';
import { ApiKeyService } from '../modules/api-keys/api-keys.service';
import { ApiKeyRepository } from '../modules/api-keys/api-keys.repository';

const apiKeyService = new ApiKeyService(new ApiKeyRepository());

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const [name, value] = pair.trim().split('=');
    if (name && value !== undefined) {
      cookies[name] = decodeURIComponent(value);
    }
  }
  return cookies;
}

export async function authenticate(c: any, next: any): Promise<void | Response> {
  const cookieHeader = c.req.header('Cookie') || '';
  const cookies = parseCookieHeader(cookieHeader);
  const sessionToken = cookies['crm_session'];
  if (!sessionToken) {
    const authHeader = c.req.header('Authorization');
    const apiKeyHeader = c.req.header('X-API-Key');
    let rawKey: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      rawKey = authHeader.slice(7);
    } else if (apiKeyHeader) {
      rawKey = apiKeyHeader;
    }

    if (rawKey) {
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

      const userPermissions = rolePermissions.map((rp) => ({
        permission: rp.permission,
        scope: rp.scope,
      }));

      const keyScopes = doc.scopes || [];
      const effectivePermissions = userPermissions.filter((up) =>
        keyScopes.some((ks) => up.permission === ks || ks === '*' || up.permission.startsWith(ks.replace('*', '')))
      );

      c.set('user', {
        id: user._id.toHexString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roleIds: user.roleIds.map((id: ObjectId) => id.toHexString()),
        teamIds: user.teamIds.map((id: ObjectId) => id.toHexString()),
        organizationId: doc.organizationId.toHexString(),
        sessionId: null,
        apiKeyId: doc._id.toHexString(),
      });
      c.set('organizationId', doc.organizationId.toHexString());
      c.set('permissions', effectivePermissions);
      return next();
    }

    c.set('user', null);
    c.set('organizationId', null);
    c.set('permissions', []);
    return next();
  }

  const tokenHash = hashToken(sessionToken);
  const session = await collections.sessions().findOne({ tokenHash });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    c.set('user', null);
    c.set('organizationId', null);
    c.set('permissions', []);
    return next();
  }

  const user = await collections.users().findOne({ _id: session.userId });
  if (!user || user.status === 'suspended' || user.status === 'deactivated') {
    c.set('user', null);
    c.set('organizationId', null);
    c.set('permissions', []);
    return next();
  }

  c.set('user', {
    id: user._id.toHexString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    roleIds: user.roleIds.map((id: ObjectId) => id.toHexString()),
    teamIds: user.teamIds.map((id: ObjectId) => id.toHexString()),
    organizationId: session.organizationId.toHexString(),
    sessionId: session._id.toHexString(),
  });
  c.set('organizationId', session.organizationId.toHexString());

  await collections.sessions().updateOne(
    { _id: session._id },
    { $set: { lastUsedAt: new Date() } }
  );

  return next();
}

export function requireAuth(c: any, next: any) {
  const user = c.get('user');
  if (!user) {
    return c.json(
      { error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
      401
    );
  }
  return next();
}
