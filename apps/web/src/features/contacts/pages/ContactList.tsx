import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useContacts, useDeleteContact } from '../hooks/useContacts';
import type { ContactResponse } from '../api/contacts';
import { usePermissions } from '../../auth/hooks/usePermissions';

export function ContactList() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, error } = useContacts({
    limit,
    cursor: page > 1 ? String((page - 1) * limit) : undefined,
    search: search || undefined,
    sort: 'createdAt',
    direction: 'desc',
  });

  const deleteMutation = useDeleteContact();
  const { hasPermission } = usePermissions();

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} contacts? This action cannot be undone.`)) {
      return;
    }
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedIds(new Set());
  };

  const columns: Column<ContactResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">
            {row.firstName} {row.lastName}
          </div>
          {row.jobTitle && (
            <div className="text-xs text-muted-foreground">{row.jobTitle}</div>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (row) => row.company?.name || '—',
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => row.email || '—',
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (row) => row.owner?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            row.status === 'active'
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Contact actions"
        >
          <MoreVertical size={16} />
        </button>
      ),
    },
  ];

  const contacts = data?.data || [];
  const totalPages = data?.meta?.hasMore ? page + 1 : page;

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage contacts and customer relationships.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load contacts. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage contacts and customer relationships.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Filter size={16} className="mr-2" />
            Filters
          </Button>
{hasPermission('contacts.create') && (
            <Link to="/app/contacts/new">
              <Button size="sm">
                <Plus size={16} className="mr-2" />
                New Contact
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-9 pr-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded">
          <span className="text-sm text-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            {hasPermission('contacts.delete') && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No contacts found"
          description="Create your first contact to start managing customer relationships."
          action={
            hasPermission('contacts.create') ? (
              <Link to="/app/contacts/new">
                <Button>Create Contact</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={contacts}
          rowKey={(row) => row.id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(row) => (window.location.href = `/app/contacts/${row.id}`)}
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
