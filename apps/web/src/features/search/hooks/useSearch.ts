import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/search';

export function useSearch(query: string, types?: string[]) {
  return useQuery({
    queryKey: ['search', query, types],
    queryFn: () => searchApi.search({ q: query, types, limit: 20 }),
    enabled: query.trim().length > 0,
  });
}
