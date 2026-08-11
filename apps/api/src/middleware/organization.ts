import { collections } from '../db/collections';
import { ObjectId } from 'mongodb';

export async function organizationContext(c: any, next: any): Promise<void | Response> {
  const user = c.get('user');
  if (!user?.organizationId) {
    c.set('organizationId', null);
    c.set('membership', null);
    return next();
  }

  const membership = await collections.organizationMemberships().findOne({
    userId: new ObjectId(user.id),
    organizationId: new ObjectId(user.organizationId),
  });

  if (!membership || membership.status === 'removed' || membership.status === 'suspended') {
    c.set('organizationId', null);
    c.set('membership', null);
    return next();
  }

  c.set('organizationId', user.organizationId);
  c.set('membership', {
    id: membership._id.toHexString(),
    roleId: membership.roleId.toHexString(),
    teamIds: membership.teamIds.map((id: ObjectId) => id.toHexString()),
    status: membership.status,
  });

  return next();
}
