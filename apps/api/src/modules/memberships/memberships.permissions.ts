export const MEMBERSHIP_PERMISSIONS = {
  read: 'memberships.read',
  create: 'memberships.create',
  update: 'memberships.update',
  delete: 'memberships.delete',
} as const;

export type MembershipPermission = typeof MEMBERSHIP_PERMISSIONS[keyof typeof MEMBERSHIP_PERMISSIONS];
