const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'An error occurred' } }));
    throw new Error(error.error?.message || 'An error occurred');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

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
