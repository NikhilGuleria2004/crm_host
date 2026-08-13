export interface OrganizationMembershipResponse {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  teamIds: string[];
  status: 'invited' | 'active' | 'suspended' | 'removed' | 'expired';
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipInput {
  userId: string;
  roleId: string;
  teamIds?: string[];
}

export interface UpdateMembershipInput {
  roleId?: string;
  teamIds?: string[];
  status?: 'invited' | 'active' | 'suspended' | 'removed' | 'expired';
}

export interface AcceptInvitationInput {
  token: string;
}
