import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { ExplorePage } from '@/pages/ExplorePage';
import { useFilterStore } from '@/store/filterStore';

// Mock charts to keep tests fast and deterministic
vi.mock('recharts', () => {
  const Stub = ({ children }: any) => <div>{children}</div>;
  return {
    ResponsiveContainer: Stub,
    LineChart: Stub,
    Line: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    BarChart: Stub,
    Bar: Stub,
  };
});

// Make FilterBar a tiny placeholder (we don't test it here)
vi.mock('@/components/FilterBar', () => ({
  FilterBar: () => <div data-testid="filterbar" />,
}));

// Ensure auth is considered authenticated in Layout wrapper
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true, initialize: vi.fn() })
}));

describe('ExplorePage', () => {
  beforeEach(() => {
    // Default fetch returns empty rows to avoid unhandled re-renders
    (global as any).fetch = vi.fn().mockResolvedValue({ json: async () => [] });
    // Reset filters (so chips render consistently)
    const store = useFilterStore.getState();
    store.setDateRange('2025-01-01', '2025-01-31');
    store.setChannel(undefined);
    store.setStore(undefined);
  });

  it('loads data with global filters and renders chips', async () => {
    // Mock the POST /api/explore/query
    (global as any).fetch.mockResolvedValueOnce({
      json: async () => [{ ts: new Date('2025-01-01').toISOString(), revenue: 100 }],
    });

    render(withAllProviders(<ExplorePage />));

    // Switch time grain to Month and trigger load
    const combos = screen.getAllByRole('combobox');
    // [0]=Medida, [1]=Tempo, [2]=Dimensao
    fireEvent.change(combos[1], { target: { value: 'month' } });
    fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));

    // Table header appears after load
    expect(await screen.findByText(/Data/i)).toBeInTheDocument();
    // Chips should include the period summary
    expect(screen.getByText(/Periodo:/i)).toBeInTheDocument();

    // Validate fetch was called with explore endpoint
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/api/explore/query'), expect.any(Object));
  });

  it('changes dimension to channel and exports CSV', async () => {
    // 1st call: JSON query
    (global as any).fetch
      .mockResolvedValueOnce({ json: async () => ([{ ts: new Date('2025-01-02').toISOString(), dim: 'iFood', orders: 3 }]) })
      // default for any other JSON call
      .mockResolvedValueOnce({ json: async () => [] })
      // CSV export
      .mockResolvedValueOnce({ blob: async () => new Blob(['ts,dim,orders\n2025-01-02,iFood,3']) });

    render(withAllProviders(<ExplorePage />));

    // Change dimension to Channel and load
    const combos2 = screen.getAllByRole('combobox');
    fireEvent.change(combos2[2], { target: { value: 'channel' } });
    fireEvent.change(combos2[0], { target: { value: 'orders' } });
    fireEvent.click(screen.getByRole('button', { name: /Consultar/i }));

    // Wait a tick for render
    await Promise.resolve();

    // Export CSV
    // Mock URL and anchor to avoid actual navigation
    const createUrl = vi.fn(() => 'blob:uri');
    const revokeUrl = vi.fn();
    (global as any).URL = { ...(global as any).URL, createObjectURL: createUrl, revokeObjectURL: revokeUrl };
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((): any => ({ href: '', download: '', click }));

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

    // Assert the CSV endpoint is hit
    expect((global as any).fetch).toHaveBeenLastCalledWith(expect.stringContaining('/api/explore/query?format=csv'), expect.any(Object));
    // And a download was initiated
    await waitFor(() => expect(createUrl).toHaveBeenCalled());
    await waitFor(() => expect(click).toHaveBeenCalled());
  });
});
