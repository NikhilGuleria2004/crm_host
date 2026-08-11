import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { useCompany, useDeleteCompany } from '../hooks/useCompanies';
import { ActivityTimeline } from '../../activities/components/ActivityTimeline';
import { NoteSection } from '../../notes/components/NoteSection';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useState } from 'react';

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useCompany(id || '');
  const deleteMutation = useDeleteCompany();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { hasPermission } = usePermissions();

  if (!id) {
    return <div className="text-danger">Company ID is required</div>;
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
        <div className="text-danger">Company not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/companies">
            <Button variant="secondary">Back to Companies</Button>
          </Link>
        </div>
      </div>
    );
  }

  const company = data.data;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    window.location.href = '/app/companies';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/companies">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{company.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {company.industry || 'No industry'}
              {company.website && <span> · {company.website}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('companies.update') && (
            <Link to={`/app/companies/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {hasPermission('companies.delete') && (
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
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Company Information</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Website</label>
                <p className="text-sm text-foreground">{company.website || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Email</label>
                <p className="text-sm text-foreground">{company.email || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Phone</label>
                <p className="text-sm text-foreground">{company.phone || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Industry</label>
                <p className="text-sm text-foreground">{company.industry || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Employee Count</label>
                <p className="text-sm text-foreground">{company.employeeCount || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Annual Revenue</label>
                <p className="text-sm text-foreground">{company.annualRevenue || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Owner</label>
                <p className="text-sm text-foreground">{company.owner?.name || '—'}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Status</label>
                <p className="text-sm text-foreground">{company.status}</p>
              </div>
            </div>
          </div>

          {company.description && (
            <div className="bg-white border border-border rounded">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Description</h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-foreground whitespace-pre-wrap">{company.description}</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-border rounded">
            <div className="p-6">
              <ActivityTimeline companyId={company.id} />
            </div>
          </div>

          <div className="bg-white border border-border rounded">
            <div className="p-6">
              <NoteSection companyId={company.id} />
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
                <p className="text-sm text-foreground">{new Date(company.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Updated</label>
                <p className="text-sm text-foreground">{new Date(company.updatedAt).toLocaleString()}</p>
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
              <h2 className="text-lg font-semibold text-foreground">Delete Company?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove {company.name} from your companies.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Company'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
