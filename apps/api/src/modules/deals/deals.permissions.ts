export const DEAL_PERMISSIONS = {
  read: 'deals.read',
  create: 'deals.create',
  update: 'deals.update',
  delete: 'deals.delete',
  import: 'deals.import',
  export: 'deals.export',
} as const;

export type DealPermission = typeof DEAL_PERMISSIONS[keyof typeof DEAL_PERMISSIONS];
