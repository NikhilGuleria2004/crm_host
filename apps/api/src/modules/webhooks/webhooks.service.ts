import { randomBytes, createHmac } from 'crypto';
import { WebhookRepository } from './webhooks.repository';
import { queue } from '../../queue';
import { validateWebhookUrl } from '../../utils/ssrf';
import type { WebhookResponse, WebhookCreateResponse, WebhookDeliveryResponse, CreateWebhookInput, UpdateWebhookInput } from './webhooks.types';
import type { WebhookDocument } from '../../types/documents';

export class WebhookService {
  constructor(private repository: WebhookRepository) {}

  async create(organizationId: string, createdBy: string, input: CreateWebhookInput): Promise<WebhookCreateResponse> {
    await validateWebhookUrl(input.url);

    const secret = randomBytes(32).toString('hex');
    const doc = await this.repository.create({
      organizationId,
      url: input.url,
      events: input.events,
      secret,
      status: input.status || 'active',
      createdBy,
    });

    return this.repository.toCreateResponse(doc, secret);
  }

  async list(organizationId: string): Promise<WebhookResponse[]> {
    const docs = await this.repository.findByOrganization(organizationId);
    return docs.map((doc) => this.repository.toResponse(doc));
  }

  async listPaginated(organizationId: string, params: { limit: number; cursor?: string }): Promise<{ data: WebhookResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }> {
    const result = await this.repository.findByOrganizationPaginated(organizationId, params);
    return {
      data: result.data.map((doc) => this.repository.toResponse(doc)),
      meta: {
        limit: params.limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async getById(id: string, organizationId: string): Promise<WebhookDocument | null> {
    const doc = await this.repository.findById(id, organizationId);
    return doc;
  }

  async update(id: string, organizationId: string, input: UpdateWebhookInput): Promise<WebhookResponse | null> {
    if (input.url) {
      await validateWebhookUrl(input.url);
    }

    const doc = await this.repository.update(id, organizationId, input);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await this.repository.delete(id, organizationId);
  }

  async getDeliveries(id: string, organizationId: string, limit = 50): Promise<WebhookDeliveryResponse[]> {
    const docs = await this.repository.findDeliveries(id, organizationId, limit);
    return docs.map((doc) => this.repository.toDeliveryResponse(doc));
  }

  async enqueueDelivery(webhookId: string, organizationId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const eventId = randomBytes(8).toString('hex');
    const jobId = `${webhookId}:${eventType}:${Date.now()}`;

    await queue.enqueue({
      version: 1,
      type: 'webhook',
      payload: {
        jobId,
        webhookId,
        organizationId,
        eventType,
        eventId,
        payload,
      },
    });
  }

  async processWebhookDelivery(payload: Record<string, unknown>, attempts: number): Promise<{ success: boolean; error?: string }> {
    const webhookId = payload.webhookId as string;
    const organizationId = payload.organizationId as string;
    const eventType = payload.eventType as string;
    const eventPayload = payload.payload as Record<string, unknown>;
    const eventId = payload.eventId as string;

    const webhook = await this.repository.findById(webhookId, organizationId);
    if (!webhook || webhook.status !== 'active') {
      return { success: true };
    }

    try {
      await validateWebhookUrl(webhook.url);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook URL validation failed',
      };
    }

    const payloadString = JSON.stringify(eventPayload);
    const signature = this.computeSignature(webhook.secret, payloadString);

    const start = Date.now();
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': eventType,
          'X-Webhook-Signature': signature,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000),
      });

      const lastStatusCode = response.status;
      const lastResponseBody = await response.text();
      const lastDuration = Date.now() - start;

      await this.repository.createDelivery({
        organizationId,
        webhookId,
        eventId,
        eventType,
        payload: eventPayload,
        attempt: attempts,
        status: response.ok ? 'delivered' : 'failed',
        responseCode: lastStatusCode,
        responseBody: lastResponseBody,
        duration: lastDuration,
        error: response.ok ? undefined : `HTTP ${lastStatusCode}`,
      });

      return { success: response.ok };
    } catch (error) {
      const lastError = error instanceof Error ? error.message : 'Network error';
      const lastDuration = Date.now() - start;

      await this.repository.createDelivery({
        organizationId,
        webhookId,
        eventId,
        eventType,
        payload: eventPayload,
        attempt: attempts,
        status: 'failed',
        duration: lastDuration,
        error: lastError,
      });

      return { success: false, error: lastError };
    }
  }

  private computeSignature(secret: string, payload: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }
}
