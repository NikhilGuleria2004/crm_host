export const AUDIT_PERMISSIONS = {
  read: 'audit_logs.read',
} as const;

export type AuditPermission = typeof AUDIT_PERMISSIONS[keyof typeof AUDIT_PERMISSIONS];
