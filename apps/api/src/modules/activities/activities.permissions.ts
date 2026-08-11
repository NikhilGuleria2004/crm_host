export const ACTIVITY_PERMISSIONS = {
  read: 'activities.read',
  create: 'activities.create',
  update: 'activities.update',
  delete: 'activities.delete',
} as const;

export type ActivityPermission = typeof ACTIVITY_PERMISSIONS[keyof typeof ACTIVITY_PERMISSIONS];
