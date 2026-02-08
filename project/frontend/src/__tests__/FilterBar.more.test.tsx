import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/components/FilterBar';
import { withAllProviders } from '@/test/utils';

const setDateRange = vi.fn();
const setChannel = vi.fn();
const setStore = vi.fn();
const resetFilters = vi.fn();

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-01-01', endDate: '2025-01-31', channelId: '', storeId: '' },
    setDateRange, setChannel, setStore, resetFilters,
  })
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    getFilters: vi.fn().mockResolvedValue({
      channels: [{ id: 1, name: 'App', type: 'D' }],
      stores: [{ id: 2, name: 'Loja A', city: 'SP', state: 'SP' }],
      categories: []
    })
  }
}));

describe('FilterBar extra interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes dates, channel, store and resets', async () => {
    render(withAllProviders(<FilterBar />));

    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2025-01-05' } });
    expect(setDateRange).toHaveBeenCalledWith('2025-01-05', '2025-01-31');

    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2025-02-01' } });
    expect(setDateRange).toHaveBeenCalledWith('2025-01-01', '2025-02-01');

    // channel
    const chan = await screen.findByLabelText('Selecionar canal');
    fireEvent.change(chan, { target: { value: '1' } });
    expect(setChannel).toHaveBeenCalled();

    // store
    const store = await screen.findByLabelText('Selecionar loja');
    fireEvent.change(store, { target: { value: '2' } });
    expect(setStore).toHaveBeenCalled();
    // now clear selection to hit undefined branch
    fireEvent.change(store, { target: { value: '' } });
    expect(setStore).toHaveBeenCalled();

    // reset
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(resetFilters).toHaveBeenCalled();
  });
});
