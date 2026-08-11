export const DASHBOARD_PERMISSIONS = {
  read: 'dashboard.read',
} as const;

export type DashboardPermission = typeof DASHBOARD_PERMISSIONS[keyof typeof DASHBOARD_PERMISSIONS];
