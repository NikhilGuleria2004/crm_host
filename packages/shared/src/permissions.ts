export const PERMISSIONS = {
  dashboard: ['read'],
  contacts: ['read', 'create', 'update', 'delete', 'export', 'import', 'assign', 'merge'],
  companies: ['read', 'create', 'update', 'delete', 'export', 'import', 'assign', 'merge'],
  leads: ['read', 'create', 'update', 'delete', 'export', 'import', 'assign', 'convert'],
  deals: ['read', 'create', 'update', 'delete', 'export', 'assign', 'move_stage'],
  tasks: ['read', 'create', 'update', 'delete', 'assign', 'complete'],
  activities: ['read', 'create', 'update', 'delete'],
  notes: ['read', 'create', 'update', 'delete'],
  files: ['read', 'upload', 'delete', 'download'],
  reports: ['read', 'create', 'update', 'delete', 'export'],
  users: ['read', 'create', 'update', 'suspend', 'delete', 'invite'],
  roles: ['read', 'create', 'update', 'delete', 'assign'],
  organization: ['read', 'update', 'delete'],
  pipelines: ['read', 'create', 'update', 'delete'],
  custom_fields: ['read', 'create', 'update', 'delete'],
  tags: ['read', 'create', 'update', 'delete'],
  integrations: ['read', 'connect', 'update', 'disconnect'],
  api_keys: ['read', 'create', 'revoke'],
  webhooks: ['read', 'create', 'update', 'delete'],
  security: ['read', 'update'],
  sessions: ['read', 'revoke'],
  audit_logs: ['read'],
} as const;

export type PermissionScope = 'NONE' | 'OWN' | 'TEAM' | 'ORGANIZATION' | 'GLOBAL';

export interface PermissionDefinition {
  key: string;
  resource: string;
  action: string;
  description: string;
}

export interface RoleDefinition {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  level: number;
  permissions: Array<{ permission: string; scope: PermissionScope }>;
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    key: 'owner',
    name: 'Owner',
    description: 'Full organization access',
    isSystem: true,
    level: 5,
    permissions: [{ permission: '*', scope: 'GLOBAL' }],
  },
  {
    key: 'administrator',
    name: 'Administrator',
    description: 'Near-complete operational access',
    isSystem: true,
    level: 4,
    permissions: [
      { permission: 'users.*', scope: 'ORGANIZATION' },
      { permission: 'roles.*', scope: 'ORGANIZATION' },
      { permission: 'contacts.*', scope: 'ORGANIZATION' },
      { permission: 'companies.*', scope: 'ORGANIZATION' },
      { permission: 'leads.*', scope: 'ORGANIZATION' },
      { permission: 'deals.*', scope: 'ORGANIZATION' },
      { permission: 'tasks.*', scope: 'ORGANIZATION' },
      { permission: 'activities.*', scope: 'ORGANIZATION' },
      { permission: 'reports.*', scope: 'ORGANIZATION' },
      { permission: 'pipelines.*', scope: 'ORGANIZATION' },
      { permission: 'custom_fields.*', scope: 'ORGANIZATION' },
      { permission: 'tags.*', scope: 'ORGANIZATION' },
      { permission: 'integrations.*', scope: 'ORGANIZATION' },
      { permission: 'api_keys.*', scope: 'ORGANIZATION' },
      { permission: 'webhooks.*', scope: 'ORGANIZATION' },
      { permission: 'audit_logs.read', scope: 'ORGANIZATION' },
      { permission: 'organization.read', scope: 'ORGANIZATION' },
      { permission: 'organization.update', scope: 'ORGANIZATION' },
      { permission: 'security.read', scope: 'ORGANIZATION' },
      { permission: 'security.update', scope: 'ORGANIZATION' },
      { permission: 'sessions.read', scope: 'ORGANIZATION' },
      { permission: 'sessions.revoke', scope: 'ORGANIZATION' },
    ],
  },
  {
    key: 'sales_manager',
    name: 'Sales Manager',
    description: 'Manage team CRM activity',
    isSystem: true,
    level: 3,
    permissions: [
      { permission: 'contacts.read', scope: 'TEAM' },
      { permission: 'contacts.create', scope: 'ORGANIZATION' },
      { permission: 'contacts.update', scope: 'TEAM' },
      { permission: 'contacts.delete', scope: 'TEAM' },
      { permission: 'contacts.export', scope: 'TEAM' },
      { permission: 'companies.read', scope: 'TEAM' },
      { permission: 'companies.create', scope: 'ORGANIZATION' },
      { permission: 'companies.update', scope: 'TEAM' },
      { permission: 'companies.delete', scope: 'TEAM' },
      { permission: 'companies.export', scope: 'TEAM' },
      { permission: 'leads.read', scope: 'TEAM' },
      { permission: 'leads.create', scope: 'ORGANIZATION' },
      { permission: 'leads.update', scope: 'TEAM' },
      { permission: 'leads.delete', scope: 'TEAM' },
      { permission: 'leads.convert', scope: 'TEAM' },
      { permission: 'deals.read', scope: 'TEAM' },
      { permission: 'deals.create', scope: 'ORGANIZATION' },
      { permission: 'deals.update', scope: 'TEAM' },
      { permission: 'deals.delete', scope: 'TEAM' },
      { permission: 'deals.export', scope: 'TEAM' },
      { permission: 'deals.move_stage', scope: 'TEAM' },
      { permission: 'tasks.read', scope: 'TEAM' },
      { permission: 'tasks.create', scope: 'ORGANIZATION' },
      { permission: 'tasks.update', scope: 'TEAM' },
      { permission: 'tasks.delete', scope: 'TEAM' },
      { permission: 'activities.read', scope: 'TEAM' },
      { permission: 'activities.create', scope: 'ORGANIZATION' },
      { permission: 'activities.update', scope: 'TEAM' },
      { permission: 'reports.read', scope: 'TEAM' },
      { permission: 'reports.create', scope: 'ORGANIZATION' },
      { permission: 'pipelines.read', scope: 'ORGANIZATION' },
    ],
  },
  {
    key: 'sales_representative',
    name: 'Sales Representative',
    description: 'Manage assigned CRM records',
    isSystem: true,
    level: 2,
    permissions: [
      { permission: 'contacts.read', scope: 'OWN' },
      { permission: 'contacts.create', scope: 'ORGANIZATION' },
      { permission: 'contacts.update', scope: 'OWN' },
      { permission: 'contacts.export', scope: 'OWN' },
      { permission: 'companies.read', scope: 'OWN' },
      { permission: 'companies.create', scope: 'ORGANIZATION' },
      { permission: 'companies.update', scope: 'OWN' },
      { permission: 'leads.read', scope: 'OWN' },
      { permission: 'leads.create', scope: 'ORGANIZATION' },
      { permission: 'leads.update', scope: 'OWN' },
      { permission: 'leads.convert', scope: 'OWN' },
      { permission: 'deals.read', scope: 'OWN' },
      { permission: 'deals.create', scope: 'ORGANIZATION' },
      { permission: 'deals.update', scope: 'OWN' },
      { permission: 'deals.move_stage', scope: 'OWN' },
      { permission: 'tasks.read', scope: 'OWN' },
      { permission: 'tasks.create', scope: 'ORGANIZATION' },
      { permission: 'tasks.update', scope: 'OWN' },
      { permission: 'tasks.complete', scope: 'OWN' },
      { permission: 'activities.read', scope: 'OWN' },
      { permission: 'activities.create', scope: 'ORGANIZATION' },
      { permission: 'activities.update', scope: 'OWN' },
      { permission: 'reports.read', scope: 'OWN' },
      { permission: 'pipelines.read', scope: 'ORGANIZATION' },
    ],
  },
  {
    key: 'support_agent',
    name: 'Support Agent',
    description: 'View and update customer-related records',
    isSystem: true,
    level: 2,
    permissions: [
      { permission: 'contacts.read', scope: 'TEAM' },
      { permission: 'companies.read', scope: 'TEAM' },
      { permission: 'deals.read', scope: 'TEAM' },
      { permission: 'activities.read', scope: 'TEAM' },
      { permission: 'activities.create', scope: 'ORGANIZATION' },
      { permission: 'activities.update', scope: 'TEAM' },
      { permission: 'tasks.read', scope: 'TEAM' },
      { permission: 'tasks.create', scope: 'ORGANIZATION' },
      { permission: 'tasks.update', scope: 'TEAM' },
      { permission: 'notes.read', scope: 'TEAM' },
      { permission: 'notes.create', scope: 'ORGANIZATION' },
      { permission: 'notes.update', scope: 'TEAM' },
      { permission: 'pipelines.read', scope: 'ORGANIZATION' },
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only access',
    isSystem: true,
    level: 1,
    permissions: [
      { permission: 'contacts.read', scope: 'ORGANIZATION' },
      { permission: 'companies.read', scope: 'ORGANIZATION' },
      { permission: 'leads.read', scope: 'ORGANIZATION' },
      { permission: 'deals.read', scope: 'ORGANIZATION' },
      { permission: 'tasks.read', scope: 'ORGANIZATION' },
      { permission: 'activities.read', scope: 'ORGANIZATION' },
      { permission: 'reports.read', scope: 'ORGANIZATION' },
      { permission: 'pipelines.read', scope: 'ORGANIZATION' },
    ],
  },
];

export function getPermissionKey(resource: string, action: string): string {
  return `${resource}.${action}`;
}

export function parsePermission(key: string): { resource: string; action: string } | null {
  const parts = key.split('.');
  if (parts.length !== 2) return null;
  return { resource: parts[0], action: parts[1] };
}
