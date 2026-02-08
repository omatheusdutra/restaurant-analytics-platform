import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { MemoryRouter } from 'react-router-dom';

export function createTestClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
  return client;
}

export const withProviders = (ui: React.ReactNode) => {
  const client = createTestClient();
  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>{ui}</PreferencesProvider>
    </QueryClientProvider>
  );
};

export const withAllProviders = (ui: React.ReactNode, initialEntries: string[] = ['/']) => {
  const client = createTestClient();
  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </PreferencesProvider>
    </QueryClientProvider>
  );
};
