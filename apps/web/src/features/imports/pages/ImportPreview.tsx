import { useState, useEffect } from 'react';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@crm/ui';
import { useImportJob, usePreviewImport, useStartImport } from '../hooks/useImports';
import { Toast } from '@crm/ui';

const DEFAULT_MAPPING: Record<string, Record<string, string>> = {
  contacts: { firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone', companyName: 'Company', jobTitle: 'Job Title' },
  companies: { name: 'Company Name', industry: 'Industry', website: 'Website', email: 'Email', phone: 'Phone' },
  leads: { firstName: 'First Name', lastName: 'Last Name', email: 'Email', phone: 'Phone', companyName: 'Company', source: 'Source' },
  deals: { name: 'Deal Name', amount: 'Amount', currency: 'Currency', probability: 'Probability', expectedCloseDate: 'Expected Close Date' },
};

export function ImportPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobData, isLoading: jobLoading } = useImportJob(id || '');
  const previewMutation = usePreviewImport();
  const startMutation = useStartImport();
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const initializedRef = React.useRef(false);

  const job = jobData?.data;
  const entity = job?.entity || 'contacts';

  useEffect(() => {
    if (job && !initializedRef.current) {
      initializedRef.current = true;
      const defaultMapping = DEFAULT_MAPPING[entity as keyof typeof DEFAULT_MAPPING] || {};
      setMapping(defaultMapping);
      previewMutation.mutate({ id: job.id, mapping: defaultMapping });
    }
  }, [job, entity, previewMutation, id]);

  const handleMappingChange = (field: string, column: string) => {
    setMapping((prev) => ({ ...prev, [field]: column }));
  };

  const handlePreview = () => {
    if (id) {
      previewMutation.mutate({ id, mapping });
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await startMutation.mutateAsync({ id, mapping });
      setToast({ message: 'Import started successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/imports/${id}`);
      }, 1000);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Import failed', type: 'error' });
    }
  };

  const preview = previewMutation.data?.data;
  const headers = preview?.headers || [];
  const rows = preview?.rows || [];
  const errors = preview?.errors || [];

  if (jobLoading) {
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
        <Button variant="secondary" onClick={() => navigate('/app/imports')}>
          Back to Imports
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Import {job.entity}</h1>
          <p className="text-muted-foreground mt-1">
            Map your CSV columns to CRM fields and preview the import.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/imports')}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={startMutation.isPending || previewMutation.isPending}>
            {startMutation.isPending ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Column Mapping</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(mapping).map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">
                  {field}
                </label>
                <select
                  value={mapping[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Skip --</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={handlePreview} disabled={previewMutation.isPending}>
              {previewMutation.isPending ? 'Refreshing...' : 'Refresh Preview'}
            </Button>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded p-4">
          <h3 className="text-sm font-medium text-warning mb-2">Validation Errors ({errors.length})</h3>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {errors.slice(0, 10).map((err, index) => (
              <div key={index} className="text-xs text-warning">
                Row {err.row}: {err.message}
              </div>
            ))}
            {errors.length > 10 && (
              <div className="text-xs text-warning">...and {errors.length - 10} more errors</div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Preview ({rows.length} rows)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Row</th>
                {headers.slice(0, 6).map((header) => (
                  <th key={header} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{index + 1}</td>
                  {headers.slice(0, 6).map((header) => (
                    <td key={header} className="px-4 py-2 text-xs text-foreground">
                      {String(row[header] || '').slice(0, 50)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Showing 10 of {rows.length} rows
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
