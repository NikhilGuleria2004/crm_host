export const SEARCH_PERMISSIONS = {
  read: 'search.read',
} as const;

export type SearchPermission = typeof SEARCH_PERMISSIONS[keyof typeof SEARCH_PERMISSIONS];
