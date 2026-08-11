import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useImportJob } from '../hooks/useImports';

export function ImportStatus() {
  const { id } = useParams<{ id: string }>();
  const { data: jobData, isLoading } = useImportJob(id || '');

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
        <div className="text-danger">Import job not found</div>
        <Link to="/app/imports">
          <Button variant="secondary">Back to Imports</Button>
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

  const progress = job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/app/imports">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import {job.entity}</h1>
          <p className="text-muted-foreground mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <span className="text-sm text-muted-foreground">Total Rows</span>
              <p className="text-2xl font-semibold text-foreground">{job.totalRows.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Processed</span>
              <p className="text-2xl font-semibold text-foreground">{job.processedRows.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created</span>
              <p className="text-2xl font-semibold text-success">{job.createdCount.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Failed</span>
              <p className="text-2xl font-semibold text-danger">{job.failedCount.toLocaleString()}</p>
            </div>
          </div>

          {job.status === 'processing' && (
            <div className="mt-6">
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{progress}% complete</p>
            </div>
          )}

          {job.status === 'completed' && (
            <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded">
              <p className="text-sm text-success font-medium">
                Import completed successfully! {job.createdCount.toLocaleString()} records created.
              </p>
            </div>
          )}

          {job.status === 'failed' && (
            <div className="mt-6 p-4 bg-danger/10 border border-danger/20 rounded">
              <p className="text-sm text-danger font-medium">
                Import failed. {job.failedCount.toLocaleString()} rows could not be processed.
              </p>
              {job.errorFileKey && (
                <Button variant="secondary" size="sm" className="mt-2">
                  Download Error Report
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
