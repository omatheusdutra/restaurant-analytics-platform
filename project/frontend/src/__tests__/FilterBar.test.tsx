import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { FilterBar } from '@/components/FilterBar';
import { withProviders } from '@/test/utils';

vi.mock('@/store/filterStore', async () => {
  const actual = await vi.importActual<any>('@/store/filterStore');
  return {
    ...actual,
    useFilterStore: () => ({
      filters: { startDate: '2025-05-01', endDate: '2025-05-31', channelId: undefined, storeId: undefined },
      setDateRange: vi.fn(),
      setChannel: vi.fn(),
      setStore: vi.fn(),
      resetFilters: vi.fn(),
    }),
  };
});

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<any>('@/api/client');
  return {
    ...actual,
    apiClient: {
      getFilters: vi.fn().mockResolvedValue({
        channels: [ { id: 1, name: 'Balcão', type: 'P' } ],
        stores: [ { id: 2, name: 'Loja Centro', city: 'SP', state: 'SP' } ],
        categories: []
      })
    }
  };
});

describe('FilterBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders inputs and updates filters', async () => {
    render(withProviders(<FilterBar />));

    // Campos básicos
    expect(screen.getByLabelText('Data inicial')).toBeInTheDocument();
    expect(screen.getByLabelText('Data final')).toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar canal')).toBeInTheDocument();
    expect(screen.getByLabelText('Selecionar loja')).toBeInTheDocument();

    // Aguarda filtros da API
    await waitFor(() => screen.getByText(/Balcão/));
    expect(screen.getByText(/Loja Centro/)).toBeInTheDocument();
  });
});

