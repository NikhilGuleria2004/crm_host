import type {
  AuthResponse,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  OrganizationMembershipResponse,
} from '../types';
import { request } from '../../../lib/request';

export const authApi = {
  register: (data: RegisterInput) =>
    request<{ data: AuthResponse }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginInput) =>
    request<{ data: AuthResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<void>('/auth/logout', {
      method: 'POST',
    }),

  me: () =>
    request<{ data: AuthResponse }>('/auth/me'),

  forgotPassword: (data: ForgotPasswordInput) =>
    request<{ data: { success: boolean } }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetPassword: (data: ResetPasswordInput) =>
    request<{ data: { success: boolean } }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changePassword: (data: ChangePasswordInput) =>
    request<{ data: { success: boolean } }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  acceptInvitation: (token: string) =>
    request<{ data: OrganizationMembershipResponse }>('/memberships/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
};
