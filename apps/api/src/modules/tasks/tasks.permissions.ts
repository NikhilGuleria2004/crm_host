export const TASK_PERMISSIONS = {
  read: 'tasks.read',
  create: 'tasks.create',
  update: 'tasks.update',
  delete: 'tasks.delete',
  assign: 'tasks.assign',
} as const;

export type TaskPermission = typeof TASK_PERMISSIONS[keyof typeof TASK_PERMISSIONS];
