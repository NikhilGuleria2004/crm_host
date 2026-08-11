export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  organization: AuthOrganization;
  permissions: string[];
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface MeResponse {
  data: AuthResponse;
}

export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    fields?: Record<string, unknown>;
  };
}

export interface OrganizationMembershipResponse {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  teamIds: string[];
  status: 'invited' | 'active' | 'suspended' | 'removed';
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
}
