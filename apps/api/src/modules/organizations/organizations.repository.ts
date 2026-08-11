import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { OrganizationDocument } from '../../types/documents';
import type { OrganizationResponse, CreateOrganizationInput, UpdateOrganizationInput } from './organizations.types';

function toResponse(doc: OrganizationDocument): OrganizationResponse {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    slug: doc.slug,
    logoUrl: doc.logoUrl,
    timezone: doc.timezone,
    currency: doc.currency,
    locale: doc.locale,
    settings: {
      dateFormat: doc.settings.dateFormat,
      fiscalYearStartMonth: doc.settings.fiscalYearStartMonth,
      defaultPipelineId: doc.settings.defaultPipelineId?.toHexString(),
      features: doc.settings.features,
    },
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export class OrganizationRepository {
  async findById(id: string): Promise<OrganizationResponse | null> {
    const doc = await collections.organizations().findOne({ _id: new ObjectId(id) });
    return doc ? toResponse(doc as OrganizationDocument) : null;
  }

  async findBySlug(slug: string): Promise<OrganizationResponse | null> {
    const doc = await collections.organizations().findOne({ slug });
    return doc ? toResponse(doc as OrganizationDocument) : null;
  }

  async create(input: CreateOrganizationInput): Promise<OrganizationResponse> {
    const now = new Date();
    const settings = {
      dateFormat: 'DD/MM/YYYY',
      fiscalYearStartMonth: 4,
    };

    const result = await collections.organizations().insertOne({
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      currency: input.currency,
      locale: input.locale,
      settings,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.organizations().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create organization');
    return toResponse(doc as OrganizationDocument);
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<OrganizationResponse | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.slug !== undefined) update.slug = input.slug;
    if (input.logoUrl !== undefined) update.logoUrl = input.logoUrl;
    if (input.timezone !== undefined) update.timezone = input.timezone;
    if (input.currency !== undefined) update.currency = input.currency;
    if (input.locale !== undefined) update.locale = input.locale;
    if (input.status !== undefined) update.status = input.status;

    await collections.organizations().updateOne({ _id: new ObjectId(id) }, { $set: update });
    return this.findById(id);
  }
}
