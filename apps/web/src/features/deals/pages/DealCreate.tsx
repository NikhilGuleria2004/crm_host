import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DealForm } from '../components/DealForm';
import { useCreateDeal } from '../hooks/useDeals';
import type { DealFormData } from '../components/DealForm';
import { Toast } from '@crm/ui';

export function DealCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateDeal();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: DealFormData) => {
    try {
      setServerError(null);
      await createMutation.mutateAsync(data);
      setToast({ message: 'Deal created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/app/deals');
      }, 500);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Failed to create deal');
      setToast({ message: 'Failed to create deal', type: 'error' });
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
          <h1 className="text-2xl font-semibold text-foreground">New Deal</h1>
          <p className="text-muted-foreground mt-1">Create a new sales opportunity.</p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <DealForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
