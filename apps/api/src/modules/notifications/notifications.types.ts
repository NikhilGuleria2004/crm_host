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

export interface NotificationListParams {
  limit?: number;
  cursor?: string;
  unread?: boolean;
}

export interface NotificationListQuery {
  limit?: number;
  cursor?: string;
  unread?: boolean;
}

export interface NotificationListResponse {
  data: NotificationResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
