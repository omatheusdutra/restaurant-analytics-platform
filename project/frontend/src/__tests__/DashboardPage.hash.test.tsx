import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';

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
    Legend: Stub,
    BarChart: Stub,
    Bar: Stub,
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
  };
});

vi.mock('@/api/client', () => ({
  apiClient: {
    getOverview: vi.fn().mockResolvedValue({
      currentPeriod: { startDate: '2025-01-01', endDate: '2025-01-31' },
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
    }),
    getTopProducts: vi.fn().mockResolvedValue([]),
    getSalesByChannel: vi.fn().mockResolvedValue([]),
    getTimeSeries: vi.fn().mockResolvedValue([]),
    getInsights: vi.fn().mockResolvedValue({ insights: [], generatedAt: '', period: { start: '', end: '' } }),
    getDataQualitySummary: vi.fn().mockResolvedValue({
      salesMissingStore: 0,
      salesMissingChannel: 0,
      salesMissingCreatedAt: 0,
      negativeTotalAmount: 0,
      nonPositiveItemQty: 0,
      orphanProductSales: 0,
      customersMissingEmail: 0,
      customersInvalidEmail: 0,
    }),
    getDataQualityTrend: vi.fn().mockResolvedValue([]),
    getExchangeRates: vi.fn().mockResolvedValue({ base: 'BRL', date: '2026-01-01', rates: { USD: 0.2, EUR: 0.18 } }),
  }
}));

// Render DashboardPage on /dashboard with hash, and assert scrollIntoView triggers
describe('DashboardPage hash deep-link', () => {
  let marker: HTMLDivElement | null = null;

  beforeEach(() => {
    // ensure target exists
    marker = document.createElement('div');
    marker.id = 'insights-section';
    document.body.appendChild(marker);

    // jsdom não implementa scrollIntoView por padrão
    if (!(Element.prototype as any).scrollIntoView) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach(() => {
    if (marker && marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
    marker = null;
  });

  it('scrolls to #insights on mount when hash is present', async () => {
    const scrollSpy = vi
      .spyOn(Element.prototype as any, 'scrollIntoView')
      .mockImplementation(() => {});
    const { DashboardPage } = await import('@/pages/DashboardPage');

    render(withAllProviders(<DashboardPage />, ['/dashboard#insights']));

    // effect should have run and tried to scroll
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    });
    scrollSpy.mockRestore();
  });
});
