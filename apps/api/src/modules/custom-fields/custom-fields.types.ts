export interface CustomFieldDefinitionResponse {
  id: string;
  organizationId: string;
  entity: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldListResponse {
  data: CustomFieldDefinitionResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CreateCustomFieldInput {
  entity: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

export interface UpdateCustomFieldInput {
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

export interface CustomFieldListParams {
  limit?: number;
  cursor?: string;
  entity?: string;
}

export interface CustomFieldListQuery {
  limit?: number;
  cursor?: string;
  entity?: string;
}
