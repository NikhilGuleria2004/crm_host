import { TagRepository } from './tags.repository';
import type { TagResponse, TagListResponse, TagListQuery } from './tags.types';

export class TagService {
  constructor(private repository: TagRepository) {}

  async list(organizationId: string, params: TagListQuery): Promise<TagListResponse> {
    const limit = params.limit || 20;

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
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

  async getById(id: string, organizationId: string): Promise<TagResponse | null> {
    const doc = await this.repository.findById(id, organizationId);
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async create(organizationId: string, name: string): Promise<TagResponse> {
    const normalizedName = name.toLowerCase().trim();
    const doc = await this.repository.create({
      organizationId,
      name: name.trim(),
      normalizedName,
    });

    return this.repository.toResponse(doc);
  }

  async update(id: string, organizationId: string, updates: { name?: string }): Promise<TagResponse | null> {
    const normalizedName = updates.name ? updates.name.toLowerCase().trim() : undefined;
    const doc = await this.repository.update(id, organizationId, {
      name: updates.name?.trim(),
      normalizedName,
    });
    if (!doc) return null;
    return this.repository.toResponse(doc);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    await this.repository.removeTagFromRecords(organizationId, id);
    return this.repository.delete(id, organizationId);
  }
}
