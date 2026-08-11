export const USER_PERMISSIONS = {
  read: 'users.read',
  create: 'users.create',
  update: 'users.update',
  delete: 'users.delete',
  invite: 'users.invite',
  suspend: 'users.suspend',
} as const;

export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];
