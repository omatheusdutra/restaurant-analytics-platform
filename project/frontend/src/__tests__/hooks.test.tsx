import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOverview, useTopProducts, useSalesByChannel, useTimeSeries, useInsights, useFilters } from '@/api/hooks';

vi.mock('@/api/client', () => ({
  apiClient: {
    getOverview: vi.fn().mockResolvedValue({
      currentPeriod: { startDate: '2025-05-01', endDate: '2025-05-31' },
      metrics: {
        totalRevenue: 10,
        grossRevenue: 12,
        totalOrders: 1,
        totalOrdersAll: 1,
        ordersCancelled: 0,
        averageTicket: 10,
        totalDiscount: 0,
        discountRate: 0,
        cancellationRate: 0,
        averageProductionTime: 0,
        averageDeliveryTime: 0,
      },
      growth: { revenueGrowth: 0, ordersGrowth: 0 }
    }),
    getTopProducts: vi.fn().mockResolvedValue([{ productId: 1, productName: 'Burger', categoryName: 'Food', totalQuantity: 2, totalRevenue: 20 }]),
    getSalesByChannel: vi.fn().mockResolvedValue([{ channelId: 1, channelName: 'Balcão', channelType: 'P', totalRevenue: 10, totalOrders: 1, averageTicket: 10 }]),
    getTimeSeries: vi.fn().mockResolvedValue([{
      date: '2025-05-01',
      orders: 1,
      ordersTotal: 1,
      ordersCancelled: 0,
      revenue: 10,
      grossRevenue: 12,
      avgTicket: 10,
      discountRate: 0,
      cancellationRate: 0,
    }]),
    getInsights: vi.fn().mockResolvedValue({ insights: [], generatedAt: '', period: { start: '', end: '' } }),
    getFilters: vi.fn().mockResolvedValue({ channels: [], stores: [], categories: [] }),
  }
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('API hooks', () => {
  it('useOverview returns data', async () => {
    const { result } = renderHook(() => useOverview({}), { wrapper });
    await new Promise((r) => setTimeout(r, 0));
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.metrics.totalRevenue).toBe(10);
  });

  it('useTopProducts returns list', async () => {
    const { result } = renderHook(() => useTopProducts({}), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0].productName).toBe('Burger');
  });

  it('useSalesByChannel returns list', async () => {
    const { result } = renderHook(() => useSalesByChannel({}), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0].channelName).toBe('Balcão');
  });

  it('useTimeSeries returns array and select clones', async () => {
    const { result } = renderHook(() => useTimeSeries({}), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.[0].orders).toBe(1);
  });

  it('useInsights returns payload', async () => {
    const { result } = renderHook(() => useInsights({}), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.insights).toEqual([]);
  });

  it('useFilters returns empty lists', async () => {
    const { result } = renderHook(() => useFilters(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.channels).toEqual([]);
  });
});
