import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { DashboardPage } from '@/pages/DashboardPage';

vi.mock('recharts', () => {
  const Stub = ({ children }: any) => <div>{children}</div>;
  return { ResponsiveContainer: Stub, LineChart: Stub, Line: Stub, CartesianGrid: Stub, XAxis: Stub, YAxis: Stub, Tooltip: Stub, Legend: Stub, BarChart: Stub, Bar: Stub, PieChart: Stub, Pie: Stub, Cell: Stub };
});

vi.mock('@/api/client', () => ({
  apiClient: {
    getOverview: vi.fn().mockResolvedValue({
      currentPeriod: { startDate: '2025-01-01', endDate: '2025-01-31' },
      metrics: {
        totalRevenue: 100,
        grossRevenue: 110,
        totalOrders: 10,
        totalOrdersAll: 12,
        ordersCancelled: 2,
        averageTicket: 10,
        totalDiscount: 0,
        discountRate: 0,
        cancellationRate: 0.1,
        averageProductionTime: 1,
        averageDeliveryTime: 2,
      },
      growth: { revenueGrowth: 0, ordersGrowth: 0 },
    }),
    getTopProducts: vi.fn().mockResolvedValue([]),
    getSalesByChannel: vi.fn().mockResolvedValue([]),
    getTimeSeries: vi.fn().mockResolvedValue([]),
    getInsights: vi.fn().mockResolvedValue({ insights: [], generatedAt: new Date().toISOString(), period: { start: '2025-01-01', end: '2025-01-31' } }),
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
    exportCSV: vi.fn().mockResolvedValue(new Blob(['a,b'])),
  }
}));

describe('Dashboard export CSV path', () => {
  it('clicks Export CSV and triggers download flow', async () => {
    // JSDOM may lack these; define if missing then spy
    // @ts-ignore
    if (!(URL as any).createObjectURL) (URL as any).createObjectURL = () => 'blob:fake';
    // @ts-ignore
    if (!(URL as any).revokeObjectURL) (URL as any).revokeObjectURL = () => {};
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const append = vi.spyOn(document.body, 'appendChild');
    const remove = vi.spyOn(document.body, 'removeChild');
    const origCreate = document.createElement;
    const anchorClicks: any[] = [];
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((tag: any) => {
      const el = origCreate.call(document, tag) as any;
      if (tag === 'a') {
        el.click = vi.fn(() => { anchorClicks.push(true); });
      }
      return el;
    }) as any);

    render(withAllProviders(<DashboardPage />));
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    const btn = screen.getByLabelText('Exportar dados para CSV');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(createObjectURL).toHaveBeenCalled();
      expect(revoke).toHaveBeenCalled();
      expect(append).toHaveBeenCalled();
      expect(remove).toHaveBeenCalled();
    });

    createObjectURL.mockRestore();
    revoke.mockRestore();
    append.mockRestore();
    remove.mockRestore();
    createSpy.mockRestore();
    expect(anchorClicks.length).toBeGreaterThan(0);
  });
});
