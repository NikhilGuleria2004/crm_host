import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Select } from '@crm/ui';
import { Textarea } from '@crm/ui';
import { useActivities, useCreateActivity, useDeleteActivity } from '../hooks/useActivities';
import { useState } from 'react';

const activityFormSchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other']),
  subject: z.string().min(1, 'Subject is required').max(255),
  description: z.string().optional().nullable(),
  occurredAt: z.string().min(1, 'Date is required'),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;

interface ActivityTimelineProps {
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  showComposer?: boolean;
}

export function ActivityTimeline({ contactId, companyId, leadId, dealId, showComposer = true }: ActivityTimelineProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useActivities({
    limit: 50,
    contactId,
    companyId,
    leadId,
    dealId,
    sort: 'occurredAt',
    direction: 'desc',
  });

  const createMutation = useCreateActivity();
  const deleteMutation = useDeleteActivity();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: 'call',
      subject: '',
      description: '',
      occurredAt: new Date().toISOString().slice(0, 16),
      durationMinutes: undefined,
    },
  });

  const handleCreate = async (formData: ActivityFormData) => {
    try {
      setError(null);
      await createMutation.mutateAsync({
        ...formData,
        occurredAt: new Date(formData.occurredAt).toISOString(),
        contactId,
        companyId,
        leadId,
        dealId,
      });
      reset({
        type: 'call',
        subject: '',
        description: '',
        occurredAt: new Date().toISOString().slice(0, 16),
        durationMinutes: undefined,
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create activity');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const activities = data?.data || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'email': return '📧';
      case 'meeting': return '👥';
      case 'demo': return '🎯';
      case 'follow_up': return '📋';
      case 'note': return '📝';
      default: return '📌';
    }
  };

  if (listError) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        Unable to load activities. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Activity</h3>
        {showComposer && !isCreating && (
          <Button variant="secondary" size="sm" onClick={() => setIsCreating(true)}>
            Log Activity
          </Button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleSubmit(handleCreate)} className="bg-white border border-border rounded p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Type"
              {...register('type')}
              options={[
                { value: 'call', label: 'Call' },
                { value: 'email', label: 'Email' },
                { value: 'meeting', label: 'Meeting' },
                { value: 'demo', label: 'Demo' },
                { value: 'follow_up', label: 'Follow Up' },
                { value: 'note', label: 'Note' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Subject"
              error={errors.subject?.message}
              {...register('subject')}
            />
            <Input
              label="Date & Time"
              type="datetime-local"
              error={errors.occurredAt?.message}
              {...register('occurredAt')}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              error={errors.durationMinutes?.message}
              {...register('durationMinutes')}
            />
          </div>
          <Textarea
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />
          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
              {isSubmitting || createMutation.isPending ? 'Saving...' : 'Save Activity'}
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No activities yet.
        </div>
      ) : (
        <div className="space-y-0">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4 py-3 border-b border-border last:border-b-0">
              <div className="flex-shrink-0 w-16 text-right text-xs text-muted-foreground pt-1">
                {formatTime(activity.occurredAt)}
              </div>
              <div className="flex-shrink-0 w-8 text-center text-lg">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {activity.subject}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.owner?.name} · {formatDate(activity.occurredAt)}
                      {activity.durationMinutes && ` · ${activity.durationMinutes} min`}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="text-muted-foreground hover:text-danger p-1"
                      aria-label="Delete activity"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
