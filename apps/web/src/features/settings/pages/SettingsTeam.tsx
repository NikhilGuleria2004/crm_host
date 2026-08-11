import { useState } from 'react';
import { Plus, Edit3, UserX } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { Modal } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { Select } from '@crm/ui';
import { Input } from '@crm/ui';
import { useUsers, useRoles, useInviteUser, useUpdateUser, useDeactivateUser } from '../hooks/useSettings';
import type { UserResponse, RoleResponse } from '../api/settings';

function getRoleName(roleIds: string[], roles: RoleResponse[] | undefined): string {
  if (!roles || !roleIds.length) return '—';
  const role = roles.find((r) => r.id === roleIds[0]);
  return role?.name || '—';
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-success/10 text-success border-success/20',
    invited: 'bg-warning/10 text-warning border-warning/20',
    suspended: 'bg-danger/10 text-danger border-danger/20',
    deactivated: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.deactivated}`}>
      {status}
    </span>
  );
}

export function SettingsTeam() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const usersQuery = useUsers();
  const rolesQuery = useRoles();
  const inviteMutation = useInviteUser();
  const updateMutation = useUpdateUser();
  const deactivateMutation = useDeactivateUser();

  const users = usersQuery.data?.data || [];
  const roles = rolesQuery.data?.data || [];

  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', roleIds: [] as string[] });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', roleIds: [] as string[] });

  const openInvite = () => {
    setInviteForm({ email: '', firstName: '', lastName: '', roleIds: [] });
    setInviteOpen(true);
  };

  const openEdit = (user: UserResponse) => {
    setSelectedUser(user);
    setEditForm({ firstName: user.firstName, lastName: user.lastName, roleIds: user.roleIds });
    setEditOpen(true);
  };

  const openDeactivate = (user: UserResponse) => {
    setSelectedUser(user);
    setDeactivateOpen(true);
  };

  const handleInviteSubmit = async () => {
    await inviteMutation.mutateAsync({
      email: inviteForm.email,
      firstName: inviteForm.firstName,
      lastName: inviteForm.lastName,
      roleIds: inviteForm.roleIds,
    });
    setInviteOpen(false);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    await updateMutation.mutateAsync({ id: selectedUser.id, body: editForm });
    setEditOpen(false);
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    await deactivateMutation.mutateAsync(selectedUser.id);
    setDeactivateOpen(false);
  };

  const columns: Column<UserResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.firstName} {row.lastName}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
        render: (row) => getRoleName(row.roleIds, roles),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
            <Edit3 size={14} />
          </Button>
          {row.status !== 'deactivated' && (
            <Button variant="ghost" size="sm" onClick={() => openDeactivate(row)}>
              <UserX size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (usersQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (usersQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {usersQuery.error.message || 'Failed to load users.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">Manage team members and invitations.</p>
        </div>
        <Button size="sm" onClick={openInvite}>
          <Plus size={16} className="mr-2" />
          Invite User
        </Button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          title="No team members"
          description="Invite your first team member to get started."
          action={
            <Button size="sm" onClick={openInvite}>
              <Plus size={16} className="mr-2" />
              Invite User
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded">
          <DataTable columns={columns} data={users} rowKey={(row) => row.id} />
        </div>
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Team Member" footer={
        <>
          <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteSubmit} disabled={inviteMutation.isPending}>Send Invitation</Button>
        </>
      }>
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            required
          />
          <Input
            label="First Name"
            value={inviteForm.firstName}
            onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
            required
          />
          <Input
            label="Last Name"
            value={inviteForm.lastName}
            onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={inviteForm.roleIds[0] || ''}
            onValueChange={(value) => setInviteForm({ ...inviteForm, roleIds: value ? [value] : [] })}
            options={roles.filter((r) => !r.isSystem || r.id === 'owner').map((r) => ({ value: r.id, label: r.name }))}
            placeholder="Select a role"
          />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Team Member" footer={
        <>
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>Save Changes</Button>
        </>
      }>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="First Name"
            value={editForm.firstName}
            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
            required
          />
          <Input
            label="Last Name"
            value={editForm.lastName}
            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
            required
          />
          <Select
            label="Role"
            value={editForm.roleIds[0] || ''}
            onValueChange={(value) => setEditForm({ ...editForm, roleIds: value ? [value] : [] })}
            options={roles.filter((r) => !r.isSystem || r.id === 'owner').map((r) => ({ value: r.id, label: r.name }))}
            placeholder="Select a role"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate user?"
        description={`This will deactivate ${selectedUser?.firstName} ${selectedUser?.lastName} and revoke all their sessions. This action can be undone by an administrator.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}
