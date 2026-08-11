export const COMPANY_PERMISSIONS = {
  read: 'companies.read',
  create: 'companies.create',
  update: 'companies.update',
  delete: 'companies.delete',
  export: 'companies.export',
  import: 'companies.import',
  assign: 'companies.assign',
  merge: 'companies.merge',
} as const;

export type CompanyPermission = typeof COMPANY_PERMISSIONS[keyof typeof COMPANY_PERMISSIONS];
