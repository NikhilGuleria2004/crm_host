export const CONTACT_PERMISSIONS = {
  read: 'contacts.read',
  create: 'contacts.create',
  update: 'contacts.update',
  delete: 'contacts.delete',
  export: 'contacts.export',
  import: 'contacts.import',
  assign: 'contacts.assign',
  merge: 'contacts.merge',
} as const;

export type ContactPermission = typeof CONTACT_PERMISSIONS[keyof typeof CONTACT_PERMISSIONS];
