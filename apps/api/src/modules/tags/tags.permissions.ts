export const TAG_PERMISSIONS = {
  read: 'tags.read',
  create: 'tags.create',
  update: 'tags.update',
  delete: 'tags.delete',
} as const;

export type TagPermission = typeof TAG_PERMISSIONS[keyof typeof TAG_PERMISSIONS];
