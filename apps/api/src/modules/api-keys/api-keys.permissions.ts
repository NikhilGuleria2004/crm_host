export const API_KEY_PERMISSIONS = {
  read: 'api_keys.read',
  create: 'api_keys.create',
  revoke: 'api_keys.revoke',
} as const;

export type ApiKeyPermission = typeof API_KEY_PERMISSIONS[keyof typeof API_KEY_PERMISSIONS];
