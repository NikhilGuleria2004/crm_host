export interface ImportJobResponse {
  id: string;
  entity: string;
  status: string;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errorFileKey?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ImportPreviewResponse {
  headers: string[];
  rows: Record<string, unknown>[];
  mapping: Record<string, string>;
  errors: Array<{ row: number; message: string }>;
}

export interface ImportStartResponse {
  id: string;
  status: string;
}

export interface ImportStartInput {
  entity?: string;
  mapping: Record<string, string>;
}

export type ImportEntity = 'contacts' | 'companies' | 'leads' | 'deals';

export interface ImportListParams {
  limit?: number;
  cursor?: string;
  entity?: string;
  status?: string;
}

export interface ImportListQuery {
  limit?: number;
  cursor?: string;
  entity?: string;
  status?: string;
}

export interface ImportListResponse {
  data: ImportJobResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ImportRowResult {
  row: number;
  action: 'created' | 'updated' | 'failed';
  id?: string;
  error?: string;
}
