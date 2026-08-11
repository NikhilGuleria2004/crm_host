import { Plus } from 'lucide-react';
import { Button } from '@crm/ui';
import { Link } from 'react-router-dom';
import { useActivities } from '../hooks/useActivities';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { EmptyState } from '@crm/ui';

export function ActivityFeed() {
  const { data, isLoading, error } = useActivities({
    limit: 50,
    sort: 'occurredAt',
    direction: 'desc',
  });

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activities</h1>
          <p className="text-muted-foreground mt-1">All activity across your CRM.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load activities. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activities</h1>
          <p className="text-muted-foreground mt-1">All activity across your CRM.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            Filters
          </Button>
          <Link to="/app/activities/new">
            <Button size="sm">
              <Plus size={16} className="mr-2" />
              Log Activity
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState
          title="No activities found"
          description="Activities will appear here as you log calls, emails, meetings, and more."
          action={
            <Link to="/app/activities/new">
              <Button>Log Activity</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-border rounded">
          <ActivityTimeline showComposer={false} />
        </div>
      )}
    </div>
  );
}
