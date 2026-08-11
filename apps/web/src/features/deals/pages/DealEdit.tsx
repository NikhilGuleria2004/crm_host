import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useDeal, useUpdateDeal } from '../hooks/useDeals';
import { DealForm } from '../components/DealForm';
import type { DealFormData } from '../components/DealForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function DealEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useDeal(id || '');
  const updateMutation = useUpdateDeal();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!id) {
    return <div className="text-danger">Deal ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  const deal = data?.data;

  const handleSubmit = async (formData: DealFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Deal updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/deals/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update deal');
      setToast({ message: 'Failed to update deal', type: 'error' });
    }
  };

  if (!deal && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Deal not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/deals">
            <Button variant="secondary">Back to Deals</Button>
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
          <Link to={`/app/deals/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Deal</h1>
          <p className="text-muted-foreground mt-1">
            Editing deal
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
          {deal && (
            <DealForm
              onSubmit={handleSubmit}
              initialData={{
                name: deal.name,
                pipelineId: deal.pipelineId,
                stageId: deal.stageId,
                companyId: deal.company?.id,
                contactId: deal.contact?.id,
                ownerId: deal.owner?.id,
                amount: deal.amount,
                currency: deal.currency,
                probability: deal.probability,
                expectedCloseDate: deal.expectedCloseDate || undefined,
                source: deal.source,
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
