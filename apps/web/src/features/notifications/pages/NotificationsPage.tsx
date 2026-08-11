import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, useMarkNotificationAsRead } from '../hooks/useNotifications';
import { Button } from '@crm/ui';

export function NotificationsPage() {
  const [limit] = useState(25);
  const [cursor, setCursor] = useState<string | undefined>();
  const { data, isLoading, error } = useNotifications({ limit, cursor, unread: false });
  const markAsReadMutation = useMarkNotificationAsRead();

  const notifications = data?.data || [];
  const meta = data?.meta;

  const handleMarkAsRead = async (id: string) => {
    await markAsReadMutation.mutateAsync(id);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task_assigned': return 'bg-primary/10 text-primary';
      case 'task_completed': return 'bg-success/10 text-success';
      case 'deal_assigned': return 'bg-warning/10 text-warning';
      case 'deal_stage_changed': return 'bg-accent/10 text-accent';
      case 'mention': return 'bg-blue-100 text-blue-700';
      case 'invitation': return 'bg-purple-100 text-purple-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load notifications. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">View and manage your notifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white border border-border rounded p-8 text-center">
          <p className="text-muted-foreground">You have no notifications.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded divide-y divide-border">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 flex items-start gap-4 ${!notification.readAt ? 'bg-primary/5' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(notification.type)}`}>
                    {notification.type.replace(/_/g, ' ')}
                  </span>
                  {!notification.readAt && (
                    <span className="text-xs text-primary font-medium">New</span>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{notification.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-1">{notification.message}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notification.entityId && (
                  <Link to={`/app/${notification.entityType}s/${notification.entityId}`}>
                    <Button variant="secondary" size="sm">Open Record</Button>
                  </Link>
                )}
                {!notification.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markAsReadMutation.isPending}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {meta && meta.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setCursor(meta.nextCursor || undefined)}
            disabled={isLoading}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
