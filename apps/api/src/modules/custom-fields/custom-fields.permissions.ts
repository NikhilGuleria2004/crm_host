export const CUSTOM_FIELD_PERMISSIONS = {
  read: 'custom_fields.read',
  create: 'custom_fields.create',
  update: 'custom_fields.update',
  delete: 'custom_fields.delete',
} as const;

export type CustomFieldPermission = typeof CUSTOM_FIELD_PERMISSIONS[keyof typeof CUSTOM_FIELD_PERMISSIONS];

export type CustomFieldEntity = 'contact' | 'company' | 'lead' | 'deal';

export const CUSTOM_FIELD_ENTITIES: CustomFieldEntity[] = ['contact', 'company', 'lead', 'deal'];
