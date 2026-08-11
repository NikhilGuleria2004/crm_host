import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Toast, Card, CardContent, CardHeader } from '@crm/ui';
import { useAuth } from '../../auth/context/AuthContext';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useOrganization, useUpdateOrganization } from '../hooks/useSettings';

const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  timezone: z.string().min(1, 'Timezone is required').max(100),
  currency: z.string().min(1, 'Currency is required').max(10),
  locale: z.string().min(1, 'Language is required').max(10),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

export function SettingsOrganization() {
  const { organization: authOrg } = useAuth();
  const { hasPermission } = usePermissions();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const canEdit = hasPermission('organization.update');

  const orgQuery = useOrganization(authOrg?.id ?? '');
  const updateMutation = useUpdateOrganization();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  useEffect(() => {
    if (orgQuery.data?.data) {
      const org = orgQuery.data.data;
      reset({
        name: org.name,
        timezone: org.timezone,
        currency: org.currency,
        locale: org.locale,
      });
    }
  }, [orgQuery.data, reset]);

  const onSubmit = async (data: OrganizationFormData) => {
    if (!authOrg?.id) return;

    try {
      setServerError(null);
      await updateMutation.mutateAsync({
        id: authOrg.id,
        body: {
          name: data.name,
          timezone: data.timezone,
          currency: data.currency,
          locale: data.locale,
        },
      });
      setToast({ message: 'Organization updated successfully', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update organization';
      setServerError(message);
      setToast({ message: 'Failed to update organization', type: 'error' });
    }
  };

  if (orgQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-96 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (orgQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {orgQuery.error.message || 'Failed to load organization.'}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Organization</h1>
          <p className="text-muted-foreground mt-1">Manage your organization settings.</p>
        </div>
      </CardHeader>
      <CardContent>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {serverError && (
          <div className="mb-4 bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Organization name"
            placeholder="Acme Corporation"
            error={errors.name?.message}
            disabled={!canEdit}
            {...register('name')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Industry"
              placeholder="Not set"
              disabled
            />
            <Input
              label="Website"
              placeholder="Not set"
              disabled
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Country"
              placeholder="Not set"
              disabled
            />
            <Input
              label="Timezone"
              placeholder="America/New_York"
              error={errors.timezone?.message}
              disabled={!canEdit}
              {...register('timezone')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Currency"
              placeholder="USD"
              error={errors.currency?.message}
              disabled={!canEdit}
              {...register('currency')}
            />
            <Input
              label="Language"
              placeholder="en-US"
              error={errors.locale?.message}
              disabled={!canEdit}
              {...register('locale')}
            />
          </div>

          {canEdit && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          )}

          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              You do not have permission to edit organization settings. Only admins/owners can modify this.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
