export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
}

export interface SearchListParams {
  q: string;
  types?: string[];
  limit?: number;
}

export interface SearchListQuery {
  q: string;
  types?: string[];
  limit?: number;
}

export type SearchQuery = SearchListQuery;
