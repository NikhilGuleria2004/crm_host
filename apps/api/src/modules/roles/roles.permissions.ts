export const ROLE_PERMISSIONS = {
  read: 'roles.read',
  create: 'roles.create',
  update: 'roles.update',
  delete: 'roles.delete',
  assign: 'roles.assign',
} as const;

export type RolePermission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];
