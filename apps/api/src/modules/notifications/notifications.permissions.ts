export const NOTIFICATION_PERMISSIONS = {
  read: 'notifications.read',
} as const;

export type NotificationPermission = typeof NOTIFICATION_PERMISSIONS[keyof typeof NOTIFICATION_PERMISSIONS];
