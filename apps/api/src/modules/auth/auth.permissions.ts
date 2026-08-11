export const AUTH_PERMISSIONS = {
  read: 'auth.read',
  update: 'security.update',
} as const;

export type AuthPermission = typeof AUTH_PERMISSIONS[keyof typeof AUTH_PERMISSIONS];

export const SECURITY_PERMISSIONS = {
  read: 'security.read',
  update: 'security.update',
} as const;

export type SecurityPermission = typeof SECURITY_PERMISSIONS[keyof typeof SECURITY_PERMISSIONS];
