import { useState } from 'react';
import { Plus, Copy, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { Modal } from '@crm/ui';
import { Input } from '@crm/ui';
import { Checkbox } from '@crm/ui';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole, useCloneRole } from '../hooks/useSettings';
import type { RoleResponse, CreateRoleInput, CloneRoleInput } from '../api/settings';
import { PERMISSIONS } from '@crm/shared';

const PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', perms: PERMISSIONS.dashboard },
  { key: 'contacts', label: 'Contacts', perms: PERMISSIONS.contacts },
  { key: 'companies', label: 'Companies', perms: PERMISSIONS.companies },
  { key: 'leads', label: 'Leads', perms: PERMISSIONS.leads },
  { key: 'deals', label: 'Deals', perms: PERMISSIONS.deals },
  { key: 'tasks', label: 'Tasks', perms: PERMISSIONS.tasks },
  { key: 'activities', label: 'Activities', perms: PERMISSIONS.activities },
  { key: 'notes', label: 'Notes', perms: PERMISSIONS.notes },
  { key: 'files', label: 'Files', perms: PERMISSIONS.files },
  { key: 'reports', label: 'Reports', perms: PERMISSIONS.reports },
  { key: 'users', label: 'Users', perms: PERMISSIONS.users },
  { key: 'roles', label: 'Roles', perms: PERMISSIONS.roles },
  { key: 'organization', label: 'Organization', perms: PERMISSIONS.organization },
  { key: 'pipelines', label: 'Pipelines', perms: PERMISSIONS.pipelines },
  { key: 'custom_fields', label: 'Custom Fields', perms: PERMISSIONS.custom_fields },
  { key: 'tags', label: 'Tags', perms: PERMISSIONS.tags },
  { key: 'integrations', label: 'Integrations', perms: PERMISSIONS.integrations },
  { key: 'api_keys', label: 'API Keys', perms: PERMISSIONS.api_keys },
  { key: 'webhooks', label: 'Webhooks', perms: PERMISSIONS.webhooks },
  { key: 'security', label: 'Security', perms: PERMISSIONS.security },
  { key: 'sessions', label: 'Sessions', perms: PERMISSIONS.sessions },
  { key: 'audit_logs', label: 'Audit Logs', perms: PERMISSIONS.audit_logs },
];

interface RoleFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: CreateRoleInput) => void;
  initialName?: string;
  initialPermissions?: string[];
  title: string;
  submitLabel: string;
  loading: boolean;
}

function RoleForm({ open, onClose, onSubmit, initialName = '', initialPermissions = [], title, submitLabel, loading }: RoleFormProps) {
  const [name, setName] = useState(initialName);
  const [selectedPerms, setSelectedPerms] = useState<string[]>(initialPermissions);

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name, permissionIds: selectedPerms });
  };

  return (
    <Modal open={open} onClose={onClose} title={title} footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading || !name.trim()}>{submitLabel}</Button>
      </>
    }>
      <div className="space-y-4">
        <Input
          label="Role Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Permissions</label>
          <div className="space-y-3 max-h-96 overflow-y-auto border border-border rounded p-3">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.key}>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{group.label}</div>
                <div className="grid grid-cols-2 gap-1">
                  {group.perms.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedPerms.includes(perm)}
                        onChange={() => togglePerm(perm)}
                      />
                      <span className="text-foreground">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function SettingsRoles() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);

  const rolesQuery = useRoles();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const cloneMutation = useCloneRole();
  const deleteMutation = useDeleteRole();

  const roles = rolesQuery.data?.data || [];

  const openCreate = () => {
    setSelectedRole(null);
    setCreateOpen(true);
  };

  const openEdit = (role: RoleResponse) => {
    setSelectedRole(role);
    setEditOpen(true);
  };

  const openClone = (role: RoleResponse) => {
    setSelectedRole(role);
    setCloneOpen(true);
  };

  const openDelete = (role: RoleResponse) => {
    setSelectedRole(role);
    setDeleteOpen(true);
  };

  const handleCreate = async (body: CreateRoleInput) => {
    await createMutation.mutateAsync(body);
    setCreateOpen(false);
  };

  const handleEdit = async (body: CreateRoleInput) => {
    if (!selectedRole) return;
    await updateMutation.mutateAsync({ id: selectedRole.id, body });
    setEditOpen(false);
  };

  const handleClone = async (body: CloneRoleInput) => {
    if (!selectedRole) return;
    await cloneMutation.mutateAsync({ id: selectedRole.id, body });
    setCloneOpen(false);
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    await deleteMutation.mutateAsync(selectedRole.id);
    setDeleteOpen(false);
  };

  const columns: Column<RoleResponse>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.name}</div>
          {row.description && <div className="text-xs text-muted-foreground">{row.description}</div>}
        </div>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (row) => (
        <span className="text-sm text-muted-foreground">{row.permissionIds.length} permissions</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) =>
        row.isSystem ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-muted text-muted-foreground border-border">System</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-primary/10 text-primary border-primary/20">Custom</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openClone(row)}>
            <Copy size={14} />
          </Button>
          {!row.isSystem && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                <Edit3 size={14} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openDelete(row)}>
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (rolesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (rolesQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {rolesQuery.error.message || 'Failed to load roles.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Roles & Permissions</h1>
          <p className="text-muted-foreground mt-1">Manage roles and their permissions.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Create Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <EmptyState
          title="No roles"
          description="Create your first role to manage permissions."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Create Role
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded">
          <DataTable columns={columns} data={roles} rowKey={(row) => row.id} />
        </div>
      )}

      <RoleForm
        key={`create-${createOpen}`}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        title="Create Role"
        submitLabel="Create Role"
        loading={createMutation.isPending}
      />

      <RoleForm
        key={`edit-${editOpen}-${selectedRole?.id}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        initialName={selectedRole?.name || ''}
        initialPermissions={selectedRole?.permissionIds || []}
        title="Edit Role"
        submitLabel="Save Changes"
        loading={updateMutation.isPending}
      />

      <RoleForm
        key={`clone-${cloneOpen}-${selectedRole?.id}`}
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        onSubmit={handleClone}
        initialName={selectedRole ? `${selectedRole.name} (Copy)` : ''}
        initialPermissions={selectedRole?.permissionIds || []}
        title="Clone Role"
        submitLabel="Clone Role"
        loading={cloneMutation.isPending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete role?"
        description={`This will permanently delete the role "${selectedRole?.name}". Users with this role will need to be reassigned.`}
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}