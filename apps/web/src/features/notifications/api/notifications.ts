import { request } from '../../../lib/request';

export interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  data: NotificationResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const notificationsApi = {
  list: (params?: { limit?: number; cursor?: string; unread?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.unread) searchParams.set('unread', 'true');
    const query = searchParams.toString();
    return request<NotificationListResponse>(`/notifications${query ? `?${query}` : ''}`);
  },

  getUnreadCount: () =>
    request<{ data: { count: number } }>('/notifications/unread-count'),

  markAsRead: (id: string) =>
    request<void>(`/notifications/${id}/read`, {
      method: 'POST',
    }),

  markAllAsRead: () =>
    request<void>('/notifications/read-all', {
      method: 'POST',
    }),
};
