import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useLead, useDeleteLead } from '../hooks/useLeads';
import { useState } from 'react';
import { usePermissions } from '../../auth/hooks/usePermissions';

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useLead(id || '');
  const deleteMutation = useDeleteLead();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { hasPermission } = usePermissions();

  if (!id) {
    return <div className="text-danger">Lead ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Lead not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/leads">
            <Button variant="secondary">Back to Leads</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lead = data.data;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    window.location.href = '/app/leads';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/leads">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {lead.firstName} {lead.lastName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {lead.companyName || 'No company'} · Status: {lead.status}
              {lead.score !== undefined && lead.score !== null && ` · Score: ${lead.score}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('leads.update') && (
            <Link to={`/app/leads/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {lead.status !== 'converted' && (
            <Link to={`/app/leads/${id}/convert`}>
            <Button variant="secondary" size="sm">
              <ArrowRightLeft size={16} className="mr-2" />
              Convert
            </Button>
            </Link>
          )}
          {hasPermission('leads.delete') && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Lead Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Name</span>
              <p className="text-sm text-foreground font-medium">
                {lead.firstName} {lead.lastName}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email</span>
              <p className="text-sm text-foreground font-medium">{lead.email || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone</span>
              <p className="text-sm text-foreground font-medium">{lead.phone || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Company</span>
              <p className="text-sm text-foreground font-medium">{lead.companyName || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Source</span>
              <p className="text-sm text-foreground font-medium">{lead.source || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p className="text-sm text-foreground font-medium">{lead.status}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Score</span>
              <p className="text-sm text-foreground font-medium">{lead.score !== undefined && lead.score !== null ? lead.score : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Owner</span>
              <p className="text-sm text-foreground font-medium">{lead.owner?.name || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Lead?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove this lead permanently.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Lead'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
