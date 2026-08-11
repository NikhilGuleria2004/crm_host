export const LEAD_PERMISSIONS = {
  read: 'leads.read',
  create: 'leads.create',
  update: 'leads.update',
  delete: 'leads.delete',
  convert: 'leads.convert',
} as const;

export type LeadPermission = typeof LEAD_PERMISSIONS[keyof typeof LEAD_PERMISSIONS];
