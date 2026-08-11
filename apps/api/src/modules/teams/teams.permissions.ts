export const TEAM_PERMISSIONS = {
  read: 'teams.read',
  create: 'teams.create',
  update: 'teams.update',
  delete: 'teams.delete',
} as const;

export type TeamPermission = typeof TEAM_PERMISSIONS[keyof typeof TEAM_PERMISSIONS];
