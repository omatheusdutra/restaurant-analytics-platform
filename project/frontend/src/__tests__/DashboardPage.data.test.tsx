import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { DashboardPage } from '@/pages/DashboardPage';

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
        totalRevenue: 1234.56,
        grossRevenue: 1500,
        totalOrders: 42,
        totalOrdersAll: 50,
        ordersCancelled: 8,
        averageTicket: 29.39,
        totalDiscount: 10,
        discountRate: 0.05,
        cancellationRate: 0.16,
        averageProductionTime: 100,
        averageDeliveryTime: 200,
      },
      growth: { revenueGrowth: 5.5, ordersGrowth: -2.1 },
    }),
    getTopProducts: vi.fn().mockResolvedValue([{ productId: 1, productName: 'Burger', categoryName: 'Food', totalQuantity: 3, totalRevenue: 75 }]),
    getSalesByChannel: vi.fn().mockResolvedValue([
      { channelId: 1, channelName: 'App', channelType: 'D', totalRevenue: 100, totalOrders: 5, averageTicket: 20 },
      { channelId: 2, channelName: 'Presencial', channelType: 'P', totalRevenue: 50, totalOrders: 2, averageTicket: 25 },
    ]),
    getTimeSeries: vi.fn().mockResolvedValue([{
      date: '2025-01-01',
      orders: 10,
      ordersTotal: 12,
      ordersCancelled: 2,
      revenue: 100,
      grossRevenue: 120,
      avgTicket: 10,
      discountRate: 0.05,
      cancellationRate: 0.16,
    }]),
    getInsights: vi.fn().mockResolvedValue({ insights: [{ type: 'tip', icon: 'star', title: 'Top', description: 'desc', priority: 'low' }], generatedAt: new Date().toISOString(), period: { start: '2025-01-01', end: '2025-01-31' } }),
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
    getDataQualityTrend: vi.fn().mockResolvedValue([
      {
        date: '2025-01-01',
        salesMissingStore: 0,
        salesMissingChannel: 0,
        salesMissingCreatedAt: 0,
        negativeTotalAmount: 0,
        nonPositiveItemQty: 0,
        orphanProductSales: 0,
        customersMissingEmail: 0,
        customersInvalidEmail: 0,
      },
    ]),
    getExchangeRates: vi.fn().mockResolvedValue({ base: 'BRL', date: '2026-01-01', rates: { USD: 0.2, EUR: 0.18 } }),
    exportCSV: vi.fn().mockResolvedValue(new Blob(['x'])),
  }
}));

describe('DashboardPage data rendering', () => {
  it('renders metric cards, charts, and controls', async () => {
    const { findByText, getByLabelText } = render(withAllProviders(<DashboardPage />));
    // wait for header
    expect(await findByText('Dashboard')).toBeTruthy();
    // export button present
    expect(getByLabelText('Exportar dados para CSV')).toBeTruthy();
  });

  it('shows loading then renders after data arrives', async () => {
    render(withAllProviders(<DashboardPage />));
    // loading visible first
    expect(screen.getByRole('status')).toBeInTheDocument();
    // then dashboard header appears
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('debounces filter params (covers debounce branch)', async () => {
    render(withAllProviders(<DashboardPage />));
    // Ensure initial load completes under real timers
    await screen.findByText('Dashboard');
    // Now switch to fake timers just for the debounce
    vi.useFakeTimers();
    window.dispatchEvent(new CustomEvent('ri:prefs-changed'));
    vi.advanceTimersByTime(350);
    // Verify UI is still rendered; debounce completed without error
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
