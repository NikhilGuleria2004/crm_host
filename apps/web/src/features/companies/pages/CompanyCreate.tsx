import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CompanyForm } from '../components/CompanyForm';
import { useCreateCompany } from '../hooks/useCompanies';
import type { CompanyFormData } from '../components/CompanyForm';
import { Toast } from '@crm/ui';

export function CompanyCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateCompany();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: CompanyFormData) => {
    try {
      setServerError(null);
      await createMutation.mutateAsync(data);
      setToast({ message: 'Company created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/app/companies');
      }, 500);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Failed to create company');
      setToast({ message: 'Failed to create company', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">New Company</h1>
          <p className="text-muted-foreground mt-1">Add a new company to your CRM.</p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <CompanyForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
