import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@crm/ui';
import { Dropdown, DropdownItem, DropdownDivider } from '@crm/ui';
import { useNotifications, useUnreadNotificationCount, useMarkAllNotificationsAsRead } from '../hooks/useNotifications';

export function NotificationBell() {
  const [, setOpen] = useState(false);
  const { data: notificationsData } = useNotifications({ limit: 5, unread: true });
  const { data: unreadCountData } = useUnreadNotificationCount();
  const markAllMutation = useMarkAllNotificationsAsRead();

  const unreadCount = unreadCountData?.data?.count || 0;
  const recentNotifications = notificationsData?.data || [];

  const handleMarkAllRead = async () => {
    await markAllMutation.mutateAsync();
  };

  return (
    <Dropdown
      align="right"
      trigger={
        <Button variant="ghost" size="sm" className="relative">
          <Bell size={16} className="mr-2" />
          <span className="hidden sm:inline text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      }
    >
      {recentNotifications.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No new notifications
        </div>
      ) : (
        <>
          <div className="px-4 py-2 flex items-center justify-between border-b border-border">
            <span className="text-sm font-medium text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                disabled={markAllMutation.isPending}
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.map((notification) => (
              <DropdownItem
                key={notification.id}
                onClick={() => setOpen(false)}
              >
                <Link
                  to={notification.entityId ? `/app/${notification.entityType}s/${notification.entityId}` : '/app/notifications'}
                  className="block"
                  onClick={() => setOpen(false)}
                >
                  <div className="text-sm font-medium text-foreground">{notification.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{notification.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </Link>
              </DropdownItem>
            ))}
          </div>
          <DropdownDivider />
          <DropdownItem>
            <Link to="/app/notifications" className="block w-full text-center" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
