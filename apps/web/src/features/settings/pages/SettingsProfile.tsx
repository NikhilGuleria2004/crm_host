import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Toast, Card, CardContent, CardHeader } from '@crm/ui';
import { useAuth } from '../../auth/context/AuthContext';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useUser, useUpdateUser } from '../hooks/useSettings';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export function SettingsProfile() {
  const { user: authUser } = useAuth();
  const { hasPermission } = usePermissions();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const canEdit = hasPermission('users.update');

  const userQuery = useUser(authUser?.id ?? '');
  const updateMutation = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (userQuery.data?.data) {
      const u = userQuery.data.data;
      reset({
        firstName: u.firstName,
        lastName: u.lastName,
      });
    }
  }, [userQuery.data, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!authUser?.id) return;

    try {
      setServerError(null);
      await updateMutation.mutateAsync({
        id: authUser.id,
        body: { firstName: data.firstName, lastName: data.lastName },
      });
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      setServerError(message);
      setToast({ message: 'Failed to update profile', type: 'error' });
    }
  };

  if (userQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-96 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (userQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {userQuery.error.message || 'Failed to load profile.'}
      </div>
    );
  }

  const userData = userQuery.data?.data;

  return (
    <Card>
      <CardHeader>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First name"
              placeholder="John"
              error={errors.firstName?.message}
              disabled={!canEdit}
              {...register('firstName')}
            />
            <Input
              label="Last name"
              placeholder="Doe"
              error={errors.lastName?.message}
              disabled={!canEdit}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={userData?.email ?? authUser?.email ?? ''}
            disabled
          />

          <div>
            <Input
              label="Phone"
              type="tel"
              placeholder="Not set"
              disabled
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Phone number is not available in your account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Timezone"
                value={userData?.preferences?.timezone ?? 'Not set'}
                disabled
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Set in your organization settings.
              </p>
            </div>
            <div>
              <Input
                label="Language"
                value={userData?.preferences?.locale ?? 'Not set'}
                disabled
              />
            </div>
          </div>

          {canEdit && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          )}

          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              You do not have permission to edit your profile. Contact an administrator.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
