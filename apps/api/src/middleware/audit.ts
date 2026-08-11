import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';

export async function auditLog(c: any, options: {
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const organizationId = c.get('organizationId');
  const user = c.get('user');
  
  if (!organizationId) {
    return;
  }

  const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined;
  const userAgent = c.req.header('user-agent') || undefined;

  await collections.auditLogs().insertOne({
    organizationId: new ObjectId(organizationId),
    actorId: user?.id ? new ObjectId(user.id) : undefined,
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId ? new ObjectId(options.entityId) : undefined,
    before: options.before,
    after: options.after,
    metadata: options.metadata,
    ipAddress,
    userAgent,
    createdAt: new Date(),
  } as any);
}
