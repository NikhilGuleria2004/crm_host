export interface TagResponse {
  id: string;
  organizationId: string;
  name: string;
  normalizedName: string;
  createdAt: string;
}

export interface TagListResponse {
  data: TagResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  name?: string;
}

export interface TagListParams {
  limit?: number;
  cursor?: string;
}

export interface TagListQuery {
  limit?: number;
  cursor?: string;
}
