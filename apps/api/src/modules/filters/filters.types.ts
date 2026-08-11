export interface FilterFieldDefinition {
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'boolean';
  operators?: string[];
  options?: Array<{ value: string; label: string }>;
}

export interface EntityFilterDefinition {
  fields: Record<string, FilterFieldDefinition>;
  sortFields: string[];
  defaultSort?: string;
  searchFields?: string[];
}

export interface ParsedFilter {
  field: string;
  operator: string;
  value: unknown;
}

export interface FilterQuery {
  filters?: ParsedFilter[];
  sort?: string;
  direction?: 'asc' | 'desc';
  [key: string]: unknown;
}
