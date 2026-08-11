import { QueryClient } from '@tanstack/react-query';
import { triggerSessionExpired } from './lib/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      // @ts-expect-error — onError works at runtime in TanStack Query v5
      onError: (error: unknown) => {
        if (error instanceof Error && error.message === 'Authentication required') {
          triggerSessionExpired();
        }
      },
    },
    mutations: {
      onError: (error: unknown) => {
        if (error instanceof Error && error.message === 'Authentication required') {
          triggerSessionExpired();
        }
      },
    },
  },
});
