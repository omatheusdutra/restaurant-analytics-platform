import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';

vi.mock('@/api/hooks', () => ({
  useOverview: () => ({
    data: {
      currentPeriod: { startDate: '', endDate: '' },
      metrics: {
        totalRevenue: 0,
        grossRevenue: 0,
        totalOrders: 0,
        totalOrdersAll: 0,
        ordersCancelled: 0,
        averageTicket: 0,
        totalDiscount: 0,
        discountRate: 0,
        cancellationRate: 0,
        averageProductionTime: 0,
        averageDeliveryTime: 0,
      },
      growth: { revenueGrowth: 0, ordersGrowth: 0 },
    }
  }),
  useTopProducts: () => ({ data: [] }),
  useSalesByChannel: () => ({ data: [] }),
  useTimeSeries: () => ({ data: [] }),
  useInsights: () => ({ data: { insights: [] } }),
  useFilters: () => ({ data: { channels: [], stores: [], categories: [] } }),
}));

describe('Pages smoke', () => {
  it('renders DashboardPage without crashing', () => {
    const { container } = render(withAllProviders(<DashboardPage />));
    expect(container.firstChild).toBeTruthy();
  });

  it('renders SettingsPage without crashing', () => {
    const { container } = render(withAllProviders(<SettingsPage />));
    expect(container.firstChild).toBeTruthy();
  });
});
