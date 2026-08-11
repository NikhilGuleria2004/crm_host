import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { FilterEngine } from '../src/modules/filters/filters.engine';
import { CONTACT_FILTERS, DEAL_FILTERS, TASK_FILTERS } from '../src/modules/filters/filters.definitions';

const orgId = new ObjectId().toHexString();

describe('P25 FilterEngine', () => {
  describe('parseQuery', () => {
    it('should parse simple query params into filters', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({ status: 'active', ownerId: '123' });

      expect(result.filters).toHaveLength(2);
      expect(result.filters![0]).toEqual({ field: 'status', operator: 'eq', value: 'active' });
      expect(result.filters![1]).toEqual({ field: 'ownerId', operator: 'eq', value: '123' });
    });

    it('should ignore non-whitelisted fields', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({ status: 'active', unknownField: 'value' });

      expect(result.filters).toHaveLength(1);
      expect(result.filters![0].field).toBe('status');
    });

    it('should ignore empty values', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({ status: '', ownerId: undefined });

      expect(result.filters).toHaveLength(0);
    });

    it('should parse complex JSON filters', () => {
      const engine = new FilterEngine(DEAL_FILTERS);
      const result = engine.parseQuery({
        filters: [
          { field: 'amount', operator: 'gte', value: 100000 },
          { field: 'status', operator: 'ne', value: 'lost' },
        ],
      });

      expect(result.filters).toHaveLength(2);
      expect(result.filters![0]).toEqual({ field: 'amount', operator: 'gte', value: 100000 });
      expect(result.filters![1]).toEqual({ field: 'status', operator: 'ne', value: 'lost' });
    });

    it('should reject non-whitelisted operators', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({
        filters: [
          { field: 'status', operator: 'invalid', value: 'active' },
        ],
      });

      expect(result.filters).toHaveLength(0);
    });

    it('should parse sort and direction', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({ sort: 'updatedAt', direction: 'asc' });

      expect(result.sort).toBe('updatedAt');
      expect(result.direction).toBe('asc');
    });

    it('should fallback to default sort', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({});

      expect(result.sort).toBe('createdAt');
    });

    it('should reject non-whitelisted sort fields', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const result = engine.parseQuery({ sort: 'invalidField' });

      expect(result.sort).toBe('createdAt');
    });
  });

  describe('buildMongoQuery', () => {
    it('should build equality query for text fields', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const query = engine.buildMongoQuery([{ field: 'status', operator: 'eq', value: 'active' }], orgId);

      expect(query).toEqual({
        organizationId: expect.any(Object),
        status: 'active',
      });
    });

    it('should build range query for number fields', () => {
      const engine = new FilterEngine(DEAL_FILTERS);
      const query = engine.buildMongoQuery([{ field: 'amount', operator: 'gte', value: 100000 }], orgId);

      expect(query.amount).toEqual({ $gte: 100000 });
    });

    it('should build date range query', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const query = engine.buildMongoQuery([{ field: 'createdAt', operator: 'gte', value: '2026-01-01' }], orgId);

      expect(query.createdAt).toEqual({ $gte: new Date('2026-01-01') });
    });

    it('should build boolean query', () => {
      const engine = new FilterEngine(TASK_FILTERS);
      const query = engine.buildMongoQuery([{ field: 'status', operator: 'eq', value: 'completed' }], orgId);

      expect(query.status).toBe('completed');
    });

    it('should skip unknown fields', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const query = engine.buildMongoQuery([{ field: 'unknown', operator: 'eq', value: 'test' }], orgId);

      expect(query).toEqual({ organizationId: expect.any(Object) });
    });
  });

  describe('buildSearchQuery', () => {
    it('should build $or query for search fields', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const query = engine.buildSearchQuery('john');

      expect(query).toEqual({
        $or: [
          { firstName: { $regex: 'john', $options: 'i' } },
          { lastName: { $regex: 'john', $options: 'i' } },
          { email: { $regex: 'john', $options: 'i' } },
          { phone: { $regex: 'john', $options: 'i' } },
        ],
      });
    });

    it('should return null for empty search', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const query = engine.buildSearchQuery('');

      expect(query).toBeNull();
    });

    it('should return null when no search fields defined', () => {
      const engine = new FilterEngine({
        fields: {},
        sortFields: ['createdAt'],
        defaultSort: 'createdAt',
      });
      const query = engine.buildSearchQuery('test');

      expect(query).toBeNull();
    });
  });

  describe('buildSort', () => {
    it('should build sort with default direction', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const sort = engine.buildSort('createdAt');

      expect(sort).toEqual({ createdAt: -1 });
    });

    it('should build sort with asc direction', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const sort = engine.buildSort('updatedAt', 'asc');

      expect(sort).toEqual({ updatedAt: 1 });
    });

    it('should fallback to default sort for invalid sort field', () => {
      const engine = new FilterEngine(CONTACT_FILTERS);
      const sort = engine.buildSort('invalidField');

      expect(sort).toEqual({ createdAt: -1 });
    });
  });
});
