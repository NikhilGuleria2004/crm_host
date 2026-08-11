import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { useContact, useDeleteContact } from '../hooks/useContacts';
import { ActivityTimeline } from '../../activities/components/ActivityTimeline';
import { NoteSection } from '../../notes/components/NoteSection';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useState } from 'react';

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useContact(id || '');
  const deleteMutation = useDeleteContact();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { hasPermission } = usePermissions();

  if (!id) {
    return <div className="text-danger">Contact ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-muted/50 rounded w-1/2 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Contact not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/contacts">
            <Button variant="secondary">Back to Contacts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const contact = data.data;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    window.location.href = '/app/contacts';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/contacts">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {contact.firstName} {contact.lastName}
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {contact.jobTitle || 'No job title'}
              {contact.company?.name && <span> · {contact.company.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div>
            {hasPermission('contacts.update') && (
            <Link to={`/app/contacts/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </Link>
            )}
          </div>
          {hasPermission('contacts.delete') && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-border rounded">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contact Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Email</label>
                <p className="text-sm text-foreground">{contact.email || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Phone</label>
                <p className="text-sm text-foreground">{contact.phone || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Company</label>
                <p className="text-sm text-foreground">{contact.company?.name || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Job Title</label>
                <p className="text-sm text-foreground">{contact.jobTitle || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Owner</label>
                <p className="text-sm text-foreground">{contact.owner?.name || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Status</label>
                <p className="text-sm text-foreground">{contact.status}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Source</label>
                <p className="text-sm text-foreground">{contact.source || '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border rounded">
            <div className="p-6">
              <ActivityTimeline contactId={contact.id} />
            </div>
          </div>

          <div className="bg-white border border-border rounded">
            <div className="p-6">
              <NoteSection contactId={contact.id} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-border rounded">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Created</label>
                <p className="text-sm text-foreground">{new Date(contact.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Updated</label>
                <p className="text-sm text-foreground">{new Date(contact.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Contact?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove {contact.firstName} {contact.lastName} from your contacts.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Contact'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
