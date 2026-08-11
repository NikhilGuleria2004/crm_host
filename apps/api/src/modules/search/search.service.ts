import { SearchRepository } from './search.repository';
import type { SearchQuery, SearchResult } from './search.types';

export class SearchService {
  constructor(private repository: SearchRepository) {}

  async search(organizationId: string, query: SearchQuery): Promise<SearchResult[]> {
    const types = query.types ? query.types.map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    const limit = query.limit || 20;

    return this.repository.search(organizationId, query.q, types, limit);
  }
}
