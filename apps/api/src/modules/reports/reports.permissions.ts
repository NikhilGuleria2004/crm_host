export const REPORTS_PERMISSIONS = {
  read: 'reports.read',
  export: 'reports.export',
} as const;

export type ReportsPermission = typeof REPORTS_PERMISSIONS[keyof typeof REPORTS_PERMISSIONS];
