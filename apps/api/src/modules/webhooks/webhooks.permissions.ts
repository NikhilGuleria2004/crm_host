export const WEBHOOK_PERMISSIONS = {
  read: 'webhooks.read',
  create: 'webhooks.create',
  update: 'webhooks.update',
  delete: 'webhooks.delete',
} as const;

export type WebhookPermission = typeof WEBHOOK_PERMISSIONS[keyof typeof WEBHOOK_PERMISSIONS];
