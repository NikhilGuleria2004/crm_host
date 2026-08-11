import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../../src/modules/webhooks/webhooks.service';
import type { WebhookRepository } from '../../src/modules/webhooks/webhooks.repository';
import { createHmac } from 'crypto';

function createMockRepository(): vi.Mocked<WebhookRepository> {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByOrganization: vi.fn(),
    findByOrganizationPaginated: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createDelivery: vi.fn(),
    findDeliveries: vi.fn(),
    findPendingRetries: vi.fn(),
    updateDeliveryStatus: vi.fn(),
    toResponse: vi.fn(),
    toCreateResponse: vi.fn(),
    toDeliveryResponse: vi.fn(),
  } as any;
}

describe('P11 Webhook Crypto', () => {
  let service: WebhookService;
  let repository: vi.Mocked<WebhookRepository>;

  beforeEach(() => {
    repository = createMockRepository();
    service = new WebhookService(repository);
  });

  it('should compute HMAC-SHA256 signature matching known vector', async () => {
    const secret = 'webhook-secret';
    const eventPayload = { event: 'contact.created', data: { id: '123' } };
    const payloadString = JSON.stringify(eventPayload);
    const expected = createHmac('sha256', secret).update(payloadString).digest('hex');

    repository.findById.mockResolvedValue({
      _id: { toHexString: () => 'webhook-id' },
      organizationId: { toHexString: () => 'org-id' },
      url: 'https://example.com/webhook',
      events: ['contact.created'],
      secret,
      status: 'active',
      createdBy: { toHexString: () => 'user-id' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('ok'),
    } as any);

    const result = await (service as any).processWebhookDelivery(
      {
        webhookId: 'webhook-id',
        organizationId: 'org-id',
        eventType: 'contact.created',
        payload: eventPayload,
        eventId: 'event-id',
      },
      1
    );

    expect(result.success).toBe(true);
    const call = (global.fetch as any).mock.calls[0];
    const signatureHeader = call[1].headers['X-Webhook-Signature'];
    expect(signatureHeader).toBe(expected);
  });

  it('should produce different signatures for different secrets', async () => {
    const payload = JSON.stringify({ test: true });
    const sig1 = createHmac('sha256', 'secret-a').update(payload).digest('hex');
    const sig2 = createHmac('sha256', 'secret-b').update(payload).digest('hex');
    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different payloads', async () => {
    const secret = 'secret';
    const sig1 = createHmac('sha256', secret).update(JSON.stringify({ a: 1 })).digest('hex');
    const sig2 = createHmac('sha256', secret).update(JSON.stringify({ a: 2 })).digest('hex');
    expect(sig1).not.toBe(sig2);
  });
});
