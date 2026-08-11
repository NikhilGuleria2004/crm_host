import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { CustomFieldForm, type CustomFieldFormData } from '../components/CustomFieldForm';
import { useCustomField, useCreateCustomField, useUpdateCustomField } from '../hooks/useCustomFields';
import { Toast } from '@crm/ui';

export function CustomFieldFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { data: fieldData, isLoading } = useCustomField(id || '');
  const createMutation = useCreateCustomField();
  const updateMutation = useUpdateCustomField();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (fieldData?.data) {
      // Component will receive initialData via props
    }
  }, [fieldData]);

  const handleCreate = async (data: CustomFieldFormData) => {
    try {
      const optionsArray = data.options ? data.options.split('\n').map((o) => o.trim()).filter(Boolean) : [];
      await createMutation.mutateAsync({
        entity: data.entity,
        key: data.key,
        label: data.label,
        type: data.type,
        required: data.required,
        options: optionsArray,
        order: data.order,
      });
      setToast({ message: 'Custom field created successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to create custom field', type: 'error' });
    }
  };

  const handleUpdate = async (data: CustomFieldFormData) => {
    if (!id) return;
    try {
      const optionsArray = data.options ? data.options.split('\n').map((o) => o.trim()).filter(Boolean) : [];
      await updateMutation.mutateAsync({
        id,
        label: data.label,
        type: data.type,
        required: data.required,
        options: optionsArray,
        order: data.order,
      });
      setToast({ message: 'Custom field updated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to update custom field', type: 'error' });
    }
  };

  const handleSubmit = async (data: CustomFieldFormData) => {
    if (isEditing) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  const field = fieldData?.data;

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
        <Link to="/app/settings/custom-fields">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{isEditing ? 'Edit Custom Field' : 'New Custom Field'}</h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update custom field settings.' : 'Create a new custom field.'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <CustomFieldForm
            onSubmit={handleSubmit}
            initialData={field ? {
              entity: field.entity as CustomFieldFormData['entity'],
              key: field.key,
              label: field.label,
              type: field.type as CustomFieldFormData['type'],
              required: field.required,
              options: field.options?.join('\n') || '',
              order: field.order,
            } : undefined}
            submitLabel={isEditing ? 'Update' : 'Create'}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
