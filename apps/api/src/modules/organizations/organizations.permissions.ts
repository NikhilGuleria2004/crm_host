export const ORGANIZATION_PERMISSIONS = {
  read: 'organization.read',
  update: 'organization.update',
  delete: 'organization.delete',
} as const;

export type OrganizationPermission = typeof ORGANIZATION_PERMISSIONS[keyof typeof ORGANIZATION_PERMISSIONS];
