import { IntegrationRepository } from './integrations.repository';
import type { IntegrationResponse, IntegrationConnectInput, IntegrationUpdateInput } from './integrations.types';
import type { IntegrationProvider, ProviderKey } from './providers/base.provider';

export class IntegrationService {
  private providers = new Map<string, IntegrationProvider>();

  constructor(private repository: IntegrationRepository) {}

  registerProvider(key: ProviderKey, provider: IntegrationProvider): void {
    this.providers.set(key, provider);
  }

  getProvider(key: ProviderKey): IntegrationProvider | undefined {
    return this.providers.get(key);
  }

  async connect(organizationId: string, createdBy: string, input: IntegrationConnectInput): Promise<IntegrationResponse> {
    const existing = await this.repository.findByProvider(organizationId, input.provider);
    if (existing) {
      throw new Error(`Integration ${input.provider} already connected`);
    }

    const provider = this.providers.get(input.provider as ProviderKey);
    if (provider) {
      await provider.connect();
    }

    const doc = await this.repository.create({
      organizationId,
      provider: input.provider,
      credentials: input.credentials,
      settings: input.settings,
      status: 'connected',
      createdBy,
    });

    return this.repository.toResponse(doc);
  }

  async list(organizationId: string): Promise<IntegrationResponse[]> {
    const docs = await this.repository.findByOrganization(organizationId);
    return docs.map((doc) => this.repository.toResponse(doc));
  }

  async listPaginated(organizationId: string, params: { limit: number; cursor?: string }): Promise<{ data: IntegrationResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }> {
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

  async getById(id: string, organizationId: string): Promise<IntegrationResponse | null> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async update(id: string, organizationId: string, input: IntegrationUpdateInput): Promise<IntegrationResponse | null> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return null;

    if (input.status === 'disconnected') {
      const provider = this.providers.get(doc.provider as ProviderKey);
      if (provider) {
        await provider.disconnect();
      }
    }

    const updated = await this.repository.update(id, organizationId, input);
    if (!updated) return null;
    return this.repository.toResponse(updated);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return;

    const provider = this.providers.get(doc.provider as ProviderKey);
    if (provider) {
      await provider.disconnect();
    }

    await this.repository.delete(id, organizationId);
  }

  async sync(id: string, organizationId: string): Promise<void> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) {
      throw new Error('Integration not found');
    }

    const provider = this.providers.get(doc.provider as ProviderKey);
    if (provider) {
      await provider.sync();
    }

    await this.repository.update(id, organizationId, { lastSyncAt: new Date() });
  }

  async handleWebhook(provider: string, payload: unknown): Promise<void> {
    const providerInstance = this.providers.get(provider as ProviderKey);
    if (providerInstance) {
      await providerInstance.handleWebhook(payload);
    }
  }
}
