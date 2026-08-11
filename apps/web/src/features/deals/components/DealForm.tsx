import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';

const dealFormSchema = z.object({
  name: z.string().min(1, 'Deal name is required').max(255),
  pipelineId: z.string().min(1, 'Pipeline is required'),
  stageId: z.string().min(1, 'Stage is required'),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseDate: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

export type DealFormData = z.infer<typeof dealFormSchema>;

interface DealFormProps {
  onSubmit: (data: DealFormData) => Promise<void>;
  initialData?: Partial<DealFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function DealForm({ onSubmit, initialData, submitLabel = 'Save Deal', isLoading }: DealFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      pipelineId: initialData?.pipelineId || '',
      stageId: initialData?.stageId || '',
      companyId: initialData?.companyId || '',
      contactId: initialData?.contactId || '',
      ownerId: initialData?.ownerId || '',
      amount: initialData?.amount || 0,
      currency: initialData?.currency || 'INR',
      probability: initialData?.probability ?? 0,
      expectedCloseDate: initialData?.expectedCloseDate || '',
      source: initialData?.source || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        pipelineId: initialData.pipelineId || '',
        stageId: initialData.stageId || '',
        companyId: initialData.companyId || '',
        contactId: initialData.contactId || '',
        ownerId: initialData.ownerId || '',
        amount: initialData.amount || 0,
        currency: initialData.currency || 'INR',
        probability: initialData.probability ?? 0,
        expectedCloseDate: initialData.expectedCloseDate || '',
        source: initialData.source || '',
      });
    }
  }, [initialData, reset]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleFormSubmit = async (data: DealFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Deal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Deal name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Amount"
            type="number"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <Input
            label="Currency"
            error={errors.currency?.message}
            {...register('currency')}
          />
          <Input
            label="Probability (%)"
            type="number"
            error={errors.probability?.message}
            {...register('probability')}
          />
          <Input
            label="Expected close date"
            type="date"
            error={errors.expectedCloseDate?.message}
            {...register('expectedCloseDate')}
          />
          <Input
            label="Source"
            error={errors.source?.message}
            {...register('source')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link to="/app/deals">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
