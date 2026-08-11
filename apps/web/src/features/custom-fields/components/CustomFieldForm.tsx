import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@crm/ui';

const customFieldFormSchema = z.object({
  entity: z.enum(['contact', 'company', 'lead', 'deal']),
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(150),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'currency',
    'date',
    'datetime',
    'boolean',
    'select',
    'multiselect',
    'email',
    'phone',
    'url',
  ]),
  required: z.boolean().default(false),
  options: z.string().optional(),
  order: z.number().int().default(0),
});

export type CustomFieldFormData = z.infer<typeof customFieldFormSchema>;

interface CustomFieldFormProps {
  onSubmit: (data: CustomFieldFormData) => Promise<void>;
  initialData?: Partial<CustomFieldFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function CustomFieldForm({ onSubmit, initialData, submitLabel = 'Save', isLoading }: CustomFieldFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      entity: initialData?.entity || 'contact',
      key: initialData?.key || '',
      label: initialData?.label || '',
      type: initialData?.type || 'text',
      required: initialData?.required || false,
      options: initialData?.options || '',
      order: initialData?.order || 0,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Entity</label>
          <select
            {...register('entity')}
            disabled={!!initialData}
            className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          >
            <option value="contact">Contact</option>
            <option value="company">Company</option>
            <option value="lead">Lead</option>
            <option value="deal">Deal</option>
          </select>
          {errors.entity && <p className="text-xs text-danger mt-1">{errors.entity.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Type</label>
          <select
            {...register('type')}
            className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="text">Text</option>
            <option value="textarea">Long Text</option>
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="date">Date</option>
            <option value="datetime">Date Time</option>
            <option value="boolean">Boolean</option>
            <option value="select">Select</option>
            <option value="multiselect">Multi-select</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="url">URL</option>
          </select>
          {errors.type && <p className="text-xs text-danger mt-1">{errors.type.message}</p>}
        </div>

        {!initialData && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Key</label>
            <input
              type="text"
              {...register('key')}
              placeholder="e.g. customerTier"
              className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {errors.key && <p className="text-xs text-danger mt-1">{errors.key.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, and underscores only.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Label</label>
          <input
            type="text"
            {...register('label')}
            placeholder="e.g. Customer Tier"
            className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.label && <p className="text-xs text-danger mt-1">{errors.label.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register('required')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label className="text-sm font-medium text-foreground">Required field</label>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">Options (one per line)</label>
          <textarea
            {...register('options')}
            placeholder="One option per line"
            rows={4}
            className="w-full px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <p className="text-xs text-muted-foreground mt-1">Enter one option per line. Only applies to Select and Multi-select types.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Order</label>
          <input
            type="number"
            {...register('order', { valueAsNumber: true })}
            className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" variant="secondary" disabled={isSubmitting || isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
