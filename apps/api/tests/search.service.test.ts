import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { SearchService } from '../src/modules/search/search.service';
import type { SearchRepository } from '../src/modules/search/search.repository';

function createMockRepository(): vi.Mocked<SearchRepository> {
  return {
    search: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();

describe('P24 SearchService', () => {
  let service: SearchService;
  let repository: vi.Mocked<SearchRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new SearchService(repository);
  });

  it('should search with default options', async () => {
    repository.search.mockResolvedValue([
      { type: 'contact', id: '1', title: 'John Doe', subtitle: 'john@example.com' },
    ]);

    const results = await service.search(orgId, { q: 'john' });

    expect(repository.search).toHaveBeenCalledWith(orgId, 'john', [], 20);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('contact');
  });

  it('should search with types filter', async () => {
    repository.search.mockResolvedValue([]);

    await service.search(orgId, { q: 'acme', types: ['contacts', 'companies'], limit: 10 });

    expect(repository.search).toHaveBeenCalledWith(orgId, 'acme', ['contacts', 'companies'], 10);
  });

  it('should return empty array when no results', async () => {
    repository.search.mockResolvedValue([]);

    const results = await service.search(orgId, { q: 'nonexistent' });

    expect(results).toHaveLength(0);
  });
});
