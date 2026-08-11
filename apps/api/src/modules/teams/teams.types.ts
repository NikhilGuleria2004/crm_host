export interface TeamResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  memberIds: string[];
  managerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  memberIds?: string[];
  managerIds?: string[];
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  memberIds?: string[];
  managerIds?: string[];
}
