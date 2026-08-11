import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useExportJob } from '../hooks/useExports';

export function ExportStatus() {
  const { id } = useParams<{ id: string }>();
  const { data: jobData, isLoading } = useExportJob(id || '');

  const job = jobData?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Export job not found</div>
        <Link to="/app/exports">
          <Button variant="secondary">Back to Exports</Button>
        </Link>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success';
      case 'processing': return 'bg-primary/10 text-primary';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'failed': return 'bg-danger/10 text-danger';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/app/exports">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Export {job.entity}</h1>
          <p className="text-muted-foreground mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <span className="text-sm text-muted-foreground">Entity</span>
              <p className="text-2xl font-semibold text-foreground capitalize">{job.entity}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Total Rows</span>
              <p className="text-2xl font-semibold text-foreground">{job.totalRows !== undefined ? job.totalRows.toLocaleString() : '-'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created At</span>
              <p className="text-sm font-medium text-foreground">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {job.status === 'completed' && job.downloadUrl && (
            <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded">
              <p className="text-sm text-success font-medium mb-3">
                Export completed successfully.
              </p>
              <Button size="sm" onClick={() => window.open(job.downloadUrl, '_blank')}>
                Download CSV
              </Button>
            </div>
          )}

          {job.status === 'pending' && (
            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded">
              <p className="text-sm text-warning font-medium">
                Export is pending. Please check back later.
              </p>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="mt-6 p-4 bg-danger/10 border border-danger/20 rounded">
              <p className="text-sm text-danger font-medium">
                Export failed. Please try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
