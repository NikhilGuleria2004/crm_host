export interface RoleResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissionIds: string[];
  isSystem: boolean;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds: string[];
  level?: number;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
  level?: number;
}

export interface CloneRoleInput {
  name: string;
  permissionIds?: string[];
}
