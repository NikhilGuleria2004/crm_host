import { SearchService } from './search.service';
import { searchQuerySchema } from './search.schema';
import type { SearchQuery } from './search.types';

const toQuery = (c: any): SearchQuery => {
  const q = c.req.query('q') || '';
  const types = c.req.query('types');
  const limit = c.req.query('limit');

  const raw: Record<string, unknown> = { q };
  if (types) raw.types = types.split(',').map((t: string) => t.trim());
  if (limit) raw.limit = parseInt(limit, 10);

  return searchQuerySchema.parse(raw) as SearchQuery;
};

export function createSearchController(service: SearchService) {
  return {
    async search(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const query = toQuery(c);
      const results = await service.search(organizationId, query);
      return c.json({ data: results });
    },
  };
}
