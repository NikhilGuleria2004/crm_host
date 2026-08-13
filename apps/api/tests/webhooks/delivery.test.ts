import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from '../../src/modules/webhooks/webhooks.service';
import type { WebhookRepository } from '../../src/modules/webhooks/webhooks.repository';

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('P11 Webhook Delivery', () => {
  let service: WebhookService;
  let repository: vi.Mocked<WebhookRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new WebhookService(repository);
    delete (global as any).fetch;
  });

  it('should record a successful delivery on HTTP 200', async () => {
    repository.findById.mockResolvedValue({
      _id: { toHexString: () => 'webhook-id' },
      organizationId: { toHexString: () => 'org-id' },
      url: 'https://example.com/webhook',
      events: ['contact.created'],
      secret: 'secret',
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

    const result = await service.processWebhookDelivery(
      {
        webhookId: 'webhook-id',
        organizationId: 'org-id',
        eventType: 'contact.created',
        payload: { id: '123' },
        eventId: 'event-1',
      },
      1
    );

    expect(result.success).toBe(true);
    expect(repository.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'delivered',
        attempt: 1,
        responseCode: 200,
      })
    );
  });

  it('should record a failed delivery on HTTP 500', async () => {
    repository.findById.mockResolvedValue({
      _id: { toHexString: () => 'webhook-id' },
      organizationId: { toHexString: () => 'org-id' },
      url: 'https://example.com/webhook',
      events: ['contact.created'],
      secret: 'secret',
      status: 'active',
      createdBy: { toHexString: () => 'user-id' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('error'),
    } as any);

    const result = await service.processWebhookDelivery(
      {
        webhookId: 'webhook-id',
        organizationId: 'org-id',
        eventType: 'contact.created',
        payload: { id: '123' },
        eventId: 'event-1',
      },
      1
    );

    expect(result.success).toBe(false);
    expect(repository.createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        attempt: 1,
        responseCode: 500,
      })
    );
  });

  it('should skip inactive webhooks', async () => {
    repository.findById.mockResolvedValue(null);

    const result = await service.processWebhookDelivery(
      {
        webhookId: 'webhook-id',
        organizationId: 'org-id',
        eventType: 'contact.created',
        payload: { id: '123' },
        eventId: 'event-1',
      },
      1
    );

    expect(result.success).toBe(true);
    expect(repository.createDelivery).not.toHaveBeenCalled();
  });

  it('should block delivery when SSRF check fails', async () => {
    repository.findById.mockResolvedValue({
      _id: { toHexString: () => 'webhook-id' },
      organizationId: { toHexString: () => 'org-id' },
      url: 'https://localhost/webhook',
      events: ['contact.created'],
      secret: 'secret',
      status: 'active',
      createdBy: { toHexString: () => 'user-id' },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await service.processWebhookDelivery(
      {
        webhookId: 'webhook-id',
        organizationId: 'org-id',
        eventType: 'contact.created',
        payload: { id: '123' },
        eventId: 'event-1',
      },
      1
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('blocked host');
    expect(global.fetch).toBeUndefined();
    expect(repository.createDelivery).not.toHaveBeenCalled();
  });
});
