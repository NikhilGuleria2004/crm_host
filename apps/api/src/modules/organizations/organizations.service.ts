import { OrganizationRepository } from './organizations.repository';
import type { CreateOrganizationInput, UpdateOrganizationInput, OrganizationResponse } from './organizations.types';

export class OrganizationService {
  constructor(private repository: OrganizationRepository) {}

  async create(input: CreateOrganizationInput): Promise<OrganizationResponse> {
    let slug = input.slug;
    if (!slug) {
      slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    const existing = await this.repository.findBySlug(slug);
    if (existing) {
      throw new Error('Organization slug already exists');
    }

    return this.repository.create({ ...input, slug });
  }

  async getById(id: string): Promise<OrganizationResponse | null> {
    return this.repository.findById(id);
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<OrganizationResponse | null> {
    if (input.slug) {
      const existing = await this.repository.findBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new Error('Organization slug already exists');
      }
    }

    return this.repository.update(id, input);
  }
}
