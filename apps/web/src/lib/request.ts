import { triggerSessionExpired } from './session';

const API_BASE = '/api/v1';

const AUTH_LOGIN_ENDPOINTS = ['/auth/login', '/auth/logout', '/auth/me', '/auth/forgot-password', '/auth/reset-password'];

export async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && !AUTH_LOGIN_ENDPOINTS.includes(endpoint)) {
      triggerSessionExpired();
    }
    const error = await response.json().catch(() => ({ error: { message: 'An error occurred' } }));
    throw new Error(error.error?.message || 'An error occurred');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
