import { request } from '../../../lib/request';

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
}

export interface SearchListResponse {
  data: SearchResult[];
}

export const searchApi = {
  search: (params: { q: string; types?: string[]; limit?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.types) searchParams.set('types', params.types.join(','));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return request<SearchListResponse>(`/search?${searchParams.toString()}`);
  },
};
