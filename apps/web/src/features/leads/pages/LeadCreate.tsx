import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LeadForm } from '../components/LeadForm';
import { useCreateLead } from '../hooks/useLeads';
import type { LeadFormData } from '../components/LeadForm';
import { Toast } from '@crm/ui';

export function LeadCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateLead();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: LeadFormData) => {
    try {
      setServerError(null);
      await createMutation.mutateAsync(data);
      setToast({ message: 'Lead created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/app/leads');
      }, 500);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Failed to create lead');
      setToast({ message: 'Failed to create lead', type: 'error' });
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
          <h1 className="text-2xl font-semibold text-foreground">New Lead</h1>
          <p className="text-muted-foreground mt-1">Create a new lead.</p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <LeadForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
