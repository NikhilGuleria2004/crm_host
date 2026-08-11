export interface WebhookListResponse {
  data: WebhookResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface WebhookResponse {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WebhookCreateResponse extends WebhookResponse {
  secret: string;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
  status?: 'active' | 'inactive';
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  status?: 'active' | 'inactive';
}

export interface WebhookDeliveryResponse {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  attempt: number;
  status: 'pending' | 'delivered' | 'failed';
  responseCode?: number;
  duration?: number;
  error?: string;
  createdAt: string;
}
