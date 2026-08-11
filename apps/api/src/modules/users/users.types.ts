export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: 'invited' | 'active' | 'suspended' | 'deactivated';
  roleIds: string[];
  teamIds: string[];
  lastLoginAt?: string;
  preferences: {
    timezone?: string;
    locale?: string;
    dateFormat?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: string[];
  teamIds?: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  teamIds?: string[];
  status?: 'invited' | 'active' | 'suspended' | 'deactivated';
}

export interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
  teamIds?: string[];
}
