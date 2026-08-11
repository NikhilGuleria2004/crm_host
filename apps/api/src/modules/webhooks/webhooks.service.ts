import { randomBytes, createHmac } from 'crypto';
import { WebhookRepository } from './webhooks.repository';
import type { WebhookResponse, WebhookCreateResponse, WebhookDeliveryResponse, CreateWebhookInput, UpdateWebhookInput } from './webhooks.types';
import type { WebhookDocument } from '../../types/documents';

const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

function computeSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function getRetryDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt - 1);
}

export class WebhookService {
  constructor(private repository: WebhookRepository) {}

  async create(organizationId: string, createdBy: string, input: CreateWebhookInput): Promise<WebhookCreateResponse> {
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

  async deliver(webhookId: string, organizationId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const webhook = await this.repository.findById(webhookId, organizationId);
    if (!webhook || webhook.status !== 'active') return;

    const eventId = randomBytes(8).toString('hex');
    const payloadString = JSON.stringify(payload);
    const signature = computeSignature(webhook.secret, payloadString);

    let attempt = 1;
    let lastStatusCode: number | undefined;
    let lastResponseBody: string | undefined;
    let lastDuration: number | undefined;
    let lastError: string | undefined;

    while (attempt <= MAX_ATTEMPTS) {
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

        lastStatusCode = response.status;
        lastResponseBody = await response.text();
        lastDuration = Date.now() - start;

        if (response.ok) {
          await this.repository.createDelivery({
            organizationId,
            webhookId,
            eventId,
            eventType,
            payload,
            attempt,
            status: 'delivered',
            responseCode: lastStatusCode,
            responseBody: lastResponseBody,
            duration: lastDuration,
          });
          return;
        }

        const isRetryable = RETRYABLE_STATUS_CODES.includes(lastStatusCode);
        if (!isRetryable || attempt === MAX_ATTEMPTS) {
          await this.repository.createDelivery({
            organizationId,
            webhookId,
            eventId,
            eventType,
            payload,
            attempt,
            status: 'failed',
            responseCode: lastStatusCode,
            responseBody: lastResponseBody,
            duration: lastDuration,
            error: `HTTP ${lastStatusCode}`,
          });
          return;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Network error';
        lastDuration = Date.now() - start;

        if (attempt === MAX_ATTEMPTS) {
          await this.repository.createDelivery({
            organizationId,
            webhookId,
            eventId,
            eventType,
            payload,
            attempt,
            status: 'failed',
            duration: lastDuration,
            error: lastError,
          });
          return;
        }
      }

      const delay = getRetryDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
