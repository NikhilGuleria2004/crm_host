import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { CompanyForm } from '../components/CompanyForm';
import { useCompany, useUpdateCompany } from '../hooks/useCompanies';
import type { CompanyFormData } from '../components/CompanyForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function CompanyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useCompany(id || '');
  const updateMutation = useUpdateCompany();
  const [serverError, setServerError] = useState<string | null>(error ? 'Failed to load company' : null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!id) {
    return <div className="text-danger">Company ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  const company = data?.data;

  const handleSubmit = async (formData: CompanyFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Company updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/companies/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update company');
      setToast({ message: 'Failed to update company', type: 'error' });
    }
  };

  if (!company && !isLoading) {
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

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center gap-4">
        <div>
          <Link to={`/app/companies/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Company</h1>
          <p className="text-muted-foreground mt-1">
            Editing {company?.name}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          {company && (
            <CompanyForm
              onSubmit={handleSubmit}
              initialData={{
                name: company.name,
                website: company.website,
                email: company.email,
                phone: company.phone,
                industry: company.industry,
                employeeCount: company.employeeCount,
                annualRevenue: company.annualRevenue,
                ownerId: company.owner?.id,
                status: company.status,
                description: company.description,
                address: company.address,
              }}
              submitLabel="Save Changes"
              isLoading={updateMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
