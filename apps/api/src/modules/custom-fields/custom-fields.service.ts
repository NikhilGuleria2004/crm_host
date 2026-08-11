import { CustomFieldRepository } from './custom-fields.repository';
import type { CustomFieldDefinitionResponse, CustomFieldListResponse, CustomFieldListQuery } from './custom-fields.types';

export class CustomFieldService {
  constructor(private repository: CustomFieldRepository) {}

  async list(organizationId: string, params: CustomFieldListQuery): Promise<CustomFieldListResponse> {
    const limit = params.limit || 20;

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      entity: params.entity,
    });

    const data = result.data.map((doc) => this.repository.toResponse(doc));

    return {
      data,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async getById(id: string, organizationId: string): Promise<CustomFieldDefinitionResponse | null> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async create(organizationId: string, input: {
    entity: string;
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    order: number;
  }): Promise<CustomFieldDefinitionResponse> {
    const normalizedKey = input.key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!normalizedKey) {
      throw new Error('Invalid field key');
    }

    const doc = await this.repository.create({
      organizationId,
      entity: input.entity,
      key: normalizedKey,
      label: input.label,
      type: input.type,
      required: input.required,
      options: input.options,
      order: input.order,
    });

    return this.repository.toResponse(doc);
  }

  async update(id: string, organizationId: string, updates: {
    label?: string;
    type?: string;
    required?: boolean;
    options?: string[];
    order?: number;
  }): Promise<CustomFieldDefinitionResponse | null> {
    const doc = await this.repository.update(id, organizationId, updates);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    return this.repository.delete(id, organizationId);
  }

  async getFieldsForEntity(organizationId: string, entity: string): Promise<CustomFieldDefinitionResponse[]> {
    const docs = await this.repository.findByEntity(organizationId, entity);
    return docs.map((doc) => this.repository.toResponse(doc));
  }
}
