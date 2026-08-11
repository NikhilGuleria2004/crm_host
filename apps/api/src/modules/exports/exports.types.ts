export interface ExportJobResponse {
  id: string;
  entity: string;
  status: string;
  totalRows?: number;
  fileKey?: string;
  downloadUrl?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExportListResponse {
  data: ExportJobResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ExportStartInput {
  entity: string;
  fields: string[];
  filters?: Record<string, unknown>;
}

export interface ExportListParams {
  limit?: number;
  cursor?: string;
  entity?: string;
  status?: string;
}

export interface ExportListQuery {
  limit?: number;
  cursor?: string;
  entity?: string;
  status?: string;
}
