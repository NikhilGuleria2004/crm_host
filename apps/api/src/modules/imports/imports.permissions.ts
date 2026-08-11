export const IMPORT_PERMISSIONS = {
  create: 'imports.create',
  read: 'imports.read',
} as const;

export type ImportPermission = typeof IMPORT_PERMISSIONS[keyof typeof IMPORT_PERMISSIONS];

export type ImportEntity = 'contacts' | 'companies' | 'leads' | 'deals';

export const IMPORT_ENTITIES: ImportEntity[] = ['contacts', 'companies', 'leads', 'deals'];
