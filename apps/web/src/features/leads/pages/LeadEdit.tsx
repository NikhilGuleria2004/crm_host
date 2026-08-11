import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useLead, useUpdateLead } from '../hooks/useLeads';
import { LeadForm } from '../components/LeadForm';
import type { LeadFormData } from '../components/LeadForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function LeadEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useLead(id || '');
  const updateMutation = useUpdateLead();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const lead = data?.data;

  const handleSubmit = async (formData: LeadFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Lead updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/leads/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update lead');
      setToast({ message: 'Failed to update lead', type: 'error' });
    }
  };

  if (!lead && !isLoading) {
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
          <Link to={`/app/leads/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Lead</h1>
          <p className="text-muted-foreground mt-1">
            Editing lead
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
          {lead && (
            <LeadForm
              onSubmit={handleSubmit}
              initialData={{
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email,
                phone: lead.phone,
                companyName: lead.companyName,
                source: lead.source,
                status: lead.status,
                ownerId: lead.owner?.id,
                score: lead.score,
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
