export const EXPORT_PERMISSIONS = {
  create: 'exports.create',
  read: 'exports.read',
} as const;

export type ExportPermission = typeof EXPORT_PERMISSIONS[keyof typeof EXPORT_PERMISSIONS];

export type ExportEntity = 'contacts' | 'companies' | 'leads' | 'deals';

export const EXPORT_ENTITIES: ExportEntity[] = ['contacts', 'companies', 'leads', 'deals'];

export const ENTITY_EXPORT_PERMISSIONS: Record<ExportEntity, string> = {
  contacts: 'contacts.export',
  companies: 'companies.export',
  leads: 'leads.export',
  deals: 'deals.export',
};
