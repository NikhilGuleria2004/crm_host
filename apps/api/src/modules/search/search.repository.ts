import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { SearchResult } from './search.types';

export class SearchRepository {
  async search(organizationId: string, query: string, types: string[] = [], limit = 20): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'i');
    const orgId = new ObjectId(organizationId);

    const searchContacts = types.length === 0 || types.includes('contacts');
    const searchCompanies = types.length === 0 || types.includes('companies');
    const searchDeals = types.length === 0 || types.includes('deals');
    const searchTasks = types.length === 0 || types.includes('tasks');
    const searchLeads = types.length === 0 || types.includes('leads');

    if (searchContacts) {
      const contacts = await collections.contacts()
        .find({
          organizationId: orgId,
          deletedAt: { $exists: false },
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex },
            { phone: regex },
          ],
        })
        .limit(limit)
        .toArray();

      for (const contact of contacts) {
        const name = `${contact.firstName} ${contact.lastName || ''}`.trim();
        results.push({
          type: 'contact',
          id: contact._id.toHexString(),
          title: name,
          subtitle: contact.email || contact.phone || undefined,
        });
      }
    }

    if (searchCompanies) {
      const companies = await collections.companies()
        .find({
          organizationId: orgId,
          deletedAt: { $exists: false },
          $or: [
            { name: regex },
            { normalizedName: regex },
            { email: regex },
            { phone: regex },
            { industry: regex },
          ],
        })
        .limit(limit)
        .toArray();

      for (const company of companies) {
        results.push({
          type: 'company',
          id: company._id.toHexString(),
          title: company.name,
          subtitle: company.industry || company.website || undefined,
        });
      }
    }

    if (searchDeals) {
      const deals = await collections.deals()
        .find({
          organizationId: orgId,
          $or: [
            { name: regex },
            { source: regex },
          ],
        })
        .limit(limit)
        .toArray();

      for (const deal of deals) {
        results.push({
          type: 'deal',
          id: deal._id.toHexString(),
          title: deal.name,
          subtitle: `${deal.currency} ${deal.amount.toLocaleString()}`,
        });
      }
    }

    if (searchTasks) {
      const tasks = await collections.tasks()
        .find({
          organizationId: orgId,
          $or: [
            { title: regex },
            { description: regex },
          ],
        })
        .limit(limit)
        .toArray();

      for (const task of tasks) {
        results.push({
          type: 'task',
          id: task._id.toHexString(),
          title: task.title,
          subtitle: task.status.replace('_', ' '),
        });
      }
    }

    if (searchLeads) {
      const leads = await collections.leads()
        .find({
          organizationId: orgId,
          deletedAt: { $exists: false },
          $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex },
            { companyName: regex },
          ],
        })
        .limit(limit)
        .toArray();

      for (const lead of leads) {
        const name = `${lead.firstName} ${lead.lastName || ''}`.trim();
        results.push({
          type: 'lead',
          id: lead._id.toHexString(),
          title: name,
          subtitle: lead.companyName || lead.email || undefined,
        });
      }
    }

    return results.slice(0, limit);
  }
}
