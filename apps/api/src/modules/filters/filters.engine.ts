import { ObjectId } from 'mongodb';
import type { EntityFilterDefinition, FilterQuery, ParsedFilter } from './filters.types';

export class FilterEngine {
  constructor(private definition: EntityFilterDefinition) {}

  parseQuery(query: Record<string, unknown>): FilterQuery {
    const result: FilterQuery = {};
    const filters: ParsedFilter[] = [];

    for (const [key, value] of Object.entries(query)) {
      if (['sort', 'direction', 'limit', 'cursor', 'search'].includes(key)) {
        continue;
      }

      if (key === 'filters' && Array.isArray(value)) {
        for (const filter of value as Array<Record<string, unknown>>) {
          const field = filter.field as string;
          const operator = (filter.operator as string) || 'eq';
          const filterValue = filter.value;

          if (field && this.isFieldAllowed(field) && this.isOperatorAllowed(field, operator)) {
            filters.push({ field, operator, value: filterValue });
          }
        }
        continue;
      }

      if (this.isFieldAllowed(key)) {
        if (value !== undefined && value !== null && value !== '') {
          filters.push({ field: key, operator: 'eq', value });
        }
      }
    }

    if (filters.length > 0) {
      result.filters = filters;
    } else {
      result.filters = [];
    }

    if (query.sort && this.definition.sortFields.includes(query.sort as string)) {
      result.sort = query.sort as string;
    } else if (this.definition.defaultSort) {
      result.sort = this.definition.defaultSort;
    }

    if (query.direction === 'asc' || query.direction === 'desc') {
      result.direction = query.direction;
    }

    return result;
  }

  buildMongoQuery(filters: ParsedFilter[], organizationId: string): Record<string, unknown> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
    };

    for (const filter of filters) {
      const fieldDef = this.definition.fields[filter.field];
      if (!fieldDef) continue;

      const { operator, value } = filter;

      switch (fieldDef.type) {
        case 'text': {
          if (operator === 'eq') {
            query[filter.field] = this.buildTextRegex(value as string, false);
          } else if (operator === 'ne') {
            query[filter.field] = { $not: this.buildTextRegex(value as string, false) };
          } else if (operator === 'contains') {
            query[filter.field] = this.buildTextRegex(value as string, false);
          } else if (operator === 'startsWith') {
            query[filter.field] = this.buildTextRegex(value as string, true);
          } else if (operator === 'endsWith') {
            query[filter.field] = this.buildTextRegex(value as string, false, true);
          }
          break;
        }
        case 'number': {
          const numValue = Number(value);
          if (operator === 'eq') {
            query[filter.field] = numValue;
          } else if (operator === 'ne') {
            query[filter.field] = { $ne: numValue };
          } else if (operator === 'gt') {
            query[filter.field] = { $gt: numValue };
          } else if (operator === 'gte') {
            query[filter.field] = { $gte: numValue };
          } else if (operator === 'lt') {
            query[filter.field] = { $lt: numValue };
          } else if (operator === 'lte') {
            query[filter.field] = { $lte: numValue };
          }
          break;
        }
        case 'date': {
          const dateValue = new Date(value as string);
          if (operator === 'eq') {
            query[filter.field] = dateValue;
          } else if (operator === 'ne') {
            query[filter.field] = { $ne: dateValue };
          } else if (operator === 'gt') {
            query[filter.field] = { $gt: dateValue };
          } else if (operator === 'gte') {
            query[filter.field] = { $gte: dateValue };
          } else if (operator === 'lt') {
            query[filter.field] = { $lt: dateValue };
          } else if (operator === 'lte') {
            query[filter.field] = { $lte: dateValue };
          }
          break;
        }
        case 'boolean': {
          query[filter.field] = value === 'true' || value === true;
          break;
        }
        case 'select': {
          query[filter.field] = value;
          break;
        }
        case 'daterange': {
          const range = value as { from?: string; to?: string };
          if (range.from || range.to) {
            query[filter.field] = {};
            if (range.from) {
              (query[filter.field] as Record<string, unknown>).$gte = new Date(range.from);
            }
            if (range.to) {
              (query[filter.field] as Record<string, unknown>).$lte = new Date(range.to);
            }
          }
          break;
        }
      }
    }

    return query;
  }

  buildSearchQuery(search: string): Record<string, unknown> | null {
    if (!search || !this.definition.searchFields || this.definition.searchFields.length === 0) {
      return null;
    }

    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const $or = this.definition.searchFields.map((field) => ({
      [field]: { $regex: escaped, $options: 'i' },
    }));

    return { $or };
  }

  buildSort(sort?: string, direction: 'asc' | 'desc' = 'desc'): Record<string, number> {
    const sortField = sort || this.definition.defaultSort || 'createdAt';
    if (!this.definition.sortFields.includes(sortField)) {
      return { [this.definition.defaultSort || 'createdAt']: -1 };
    }
    return { [sortField]: direction === 'asc' ? 1 : -1 };
  }

  private isFieldAllowed(field: string): boolean {
    return field in this.definition.fields;
  }

  private isOperatorAllowed(field: string, operator: string): boolean {
    const fieldDef = this.definition.fields[field];
    if (!fieldDef || !fieldDef.operators) return false;
    return fieldDef.operators.includes(operator);
  }

  private buildTextRegex(value: string, startsWith: boolean, endsWith = false): Record<string, unknown> {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (startsWith && endsWith) {
      return { $regex: `^${escaped}$`, $options: 'i' };
    }
    if (startsWith) {
      return { $regex: `^${escaped}`, $options: 'i' };
    }
    if (endsWith) {
      return { $regex: `${escaped}$`, $options: 'i' };
    }
    return { $regex: escaped, $options: 'i' };
  }
}
