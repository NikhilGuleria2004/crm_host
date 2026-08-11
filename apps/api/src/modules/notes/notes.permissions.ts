export const NOTE_PERMISSIONS = {
  read: 'notes.read',
  create: 'notes.create',
  update: 'notes.update',
  delete: 'notes.delete',
} as const;

export type NotePermission = typeof NOTE_PERMISSIONS[keyof typeof NOTE_PERMISSIONS];
