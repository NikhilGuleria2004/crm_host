export const SESSION_PERMISSIONS = {
  read: 'sessions.read',
  revoke: 'sessions.revoke',
} as const;

export type SessionPermission = typeof SESSION_PERMISSIONS[keyof typeof SESSION_PERMISSIONS];
