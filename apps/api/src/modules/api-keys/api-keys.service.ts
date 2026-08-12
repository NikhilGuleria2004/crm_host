import { randomBytes } from 'crypto';
import { hashToken } from '../../utils/crypto';
import { ApiKeyRepository } from './api-keys.repository';
import type { ApiKeyResponse, ApiKeyCreateResponse, CreateApiKeyInput } from './api-keys.types';
import type { ApiKeyDocument } from '../../types/documents';

export class ApiKeyService {
  constructor(private repository: ApiKeyRepository) {}

  async create(organizationId: string, createdBy: string, input: CreateApiKeyInput): Promise<ApiKeyCreateResponse> {
    const rawKey = `crm_live_${randomBytes(24).toString('hex')}`;
    const keyHash = hashToken(rawKey);

    const doc = await this.repository.create({
      organizationId,
      name: input.name,
      keyHash,
      scopes: input.scopes,
      createdBy,
    });

    return this.repository.toCreateResponse(doc, rawKey);
  }

  async list(organizationId: string): Promise<ApiKeyResponse[]> {
    const docs = await this.repository.findByOrganization(organizationId);
    return docs.map((doc) => this.repository.toResponse(doc));
  }

  async listPaginated(organizationId: string, params: { limit: number; cursor?: string }): Promise<{ data: ApiKeyResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }> {
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

  async revoke(id: string, organizationId: string): Promise<void> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) {
      throw new Error('API key not found');
    }
    if (doc.revokedAt) {
      throw new Error('API key is already revoked');
    }
    await this.repository.revoke(id, organizationId);
  }

  async validateKey(rawKey: string, organizationId?: string): Promise<ApiKeyDocument | null> {
    const keyHash = hashToken(rawKey);
    const doc = await this.repository.findByKeyHash(keyHash, organizationId);
    if (doc) {
      await this.repository.updateLastUsed(doc._id.toHexString(), doc.organizationId.toHexString());
    }
    return doc;
  }
}
