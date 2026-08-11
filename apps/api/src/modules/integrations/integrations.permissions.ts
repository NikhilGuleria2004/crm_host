export const INTEGRATION_PERMISSIONS = {
  read: 'integrations.read',
  connect: 'integrations.connect',
  update: 'integrations.update',
  disconnect: 'integrations.disconnect',
} as const;

export type IntegrationPermission = typeof INTEGRATION_PERMISSIONS[keyof typeof INTEGRATION_PERMISSIONS];
