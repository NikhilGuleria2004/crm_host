import { hashToken } from '../../utils/crypto';
import { MembershipRepository } from './memberships.repository';
import type { CreateMembershipInput, UpdateMembershipInput, OrganizationMembershipResponse } from './memberships.types';

export class MembershipService {
  constructor(private repository: MembershipRepository) {}

  async inviteUser(organizationId: string, input: CreateMembershipInput): Promise<OrganizationMembershipResponse> {
    const existing = await this.repository.findByUserAndOrg(input.userId, organizationId);
    if (existing && existing.status !== 'removed') {
      throw new Error('User is already a member of this organization');
    }

    const membership = await this.repository.create({
      ...input,
      organizationId,
      status: 'invited',
    });
    return this.repository.toResponse(membership) as OrganizationMembershipResponse;
  }

  async acceptInvitation(token: string): Promise<OrganizationMembershipResponse> {
    const tokenHash = hashToken(token);
    const membership = await this.repository.findByInvitationToken(tokenHash);
    if (!membership) {
      throw new Error('Invalid or expired invitation');
    }

    const updated = await this.repository.update(membership._id.toHexString(), membership.organizationId.toHexString(), { status: 'active' });
    return this.repository.toResponse(updated) as OrganizationMembershipResponse;
  }

  async getByOrganization(organizationId: string): Promise<OrganizationMembershipResponse[]> {
    const memberships = await this.repository.findByOrganization(organizationId);
    return memberships.map((m) => this.repository.toResponse(m) as OrganizationMembershipResponse);
  }

  async getById(id: string, organizationId: string): Promise<OrganizationMembershipResponse | null> {
    const membership = await this.repository.findById(id, organizationId);
    return this.repository.toResponse(membership) as OrganizationMembershipResponse | null;
  }

  async update(id: string, organizationId: string, input: UpdateMembershipInput): Promise<OrganizationMembershipResponse | null> {
    const membership = await this.repository.update(id, organizationId, input);
    return this.repository.toResponse(membership) as OrganizationMembershipResponse | null;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    await this.repository.remove(id, organizationId);
  }

  async getByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembershipResponse | null> {
    const membership = await this.repository.findByUserAndOrg(userId, organizationId);
    return this.repository.toResponse(membership) as OrganizationMembershipResponse | null;
  }
}
