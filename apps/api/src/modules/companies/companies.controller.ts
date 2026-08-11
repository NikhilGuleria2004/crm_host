import { z } from 'zod';
import { CompanyService } from './companies.service';
import { createCompanySchema, updateCompanySchema, companyListQuerySchema } from './companies.schema';
import type { CreateCompanyInput, UpdateCompanyInput, CompanyListQuery } from './companies.types';

const toCreateInput = (body: unknown): CreateCompanyInput => {
  return createCompanySchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateCompanyInput => {
  return updateCompanySchema.parse(body);
};

const toListQuery = (c: any): CompanyListQuery => {
  const query: CompanyListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const industry = c.req.query('industry');
  const ownerId = c.req.query('ownerId');
  const status = c.req.query('status');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (search) query.search = search;
  if (industry) query.industry = industry;
  if (ownerId) query.ownerId = ownerId;
  if (status) query.status = status;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return companyListQuerySchema.parse(query);
};

export function createCompaniesController(service: CompanyService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const query = toListQuery(c);
      const result = await service.list(organizationId, query);
      return c.json({ data: result.data, meta: result.meta });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const input = toCreateInput(await c.req.json());
        const company = await service.create(organizationId, user.id, input);
        return c.json({ data: company }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Company with this name already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const company = await service.getDetail(id, organizationId);
      if (!company) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Company not found' } }, 404);
      }
      return c.json({ data: company });
    },

    async update(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = toUpdateInput(await c.req.json());
        const company = await service.update(id, organizationId, user.id, input);
        if (!company) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Company not found' } }, 404);
        }
        return c.json({ data: company });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Company with this name already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async delete(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const id = c.req.param('id');
        await service.delete(id, organizationId, c);
        return c.json({ data: { id, status: 'deleted' } });
      } catch (error) {
        if (error instanceof Error && error.message === 'Company not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Company not found' } }, 404);
        }
        throw error;
      }
    },

    async bulkUpdate(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const body = await c.req.json();
        const { ids, changes } = z.object({
          ids: z.array(z.string()),
          changes: updateCompanySchema.partial(),
        }).parse(body);

        const companies = await service.list(organizationId, { limit: 500 });
        const targetIds = new Set(ids);

        let updated = 0;
        for (const company of companies.data) {
          if (targetIds.has(company.id)) {
            await service.update(company.id, organizationId, user.id, changes);
            updated++;
          }
        }

        return c.json({ data: { updated, total: ids.length } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async bulkDelete(c: any) {
      const organizationId = c.get('organizationId');
      const body = await c.req.json();
      const { ids } = z.object({ ids: z.array(z.string()) }).parse(body);

      const result = await service.bulkDelete(ids, organizationId, c);
      return c.json({ data: result });
    },
  };
}
