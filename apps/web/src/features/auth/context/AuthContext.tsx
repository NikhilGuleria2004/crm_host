/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import type { AuthResponse, AuthUser, AuthOrganization } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  refetchMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: Infinity,
  });

  const authData: AuthResponse | undefined = meQuery.data?.data;

  const isAuthenticated = !!authData;

  const login = async (data: { email: string; password: string }) => {
    await authApi.login(data);
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    await authApi.register(data);
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const logout = async () => {
    await authApi.logout();
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const refetchMe = async () => {
    await meQuery.refetch();
  };

  return (
    <AuthContext.Provider
      value={{
        user: authData?.user ?? null,
        organization: authData?.organization ?? null,
        permissions: authData?.permissions ?? [],
        isLoading: meQuery.isLoading,
        isAuthenticated,
        login,
        logout,
        register,
        refetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
