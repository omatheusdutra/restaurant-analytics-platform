import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/api/client';

const fetchMock = vi.fn();

describe('apiClient full surface', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global as any).fetch = fetchMock;
    localStorage.clear();
    apiClient.setToken('t');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
  });

  it('covers all GET endpoints and dashboard CRUD wrappers', async () => {
    // metrics
    await apiClient.getOverview({});
    await apiClient.getTopProducts({});
    await apiClient.getSalesByChannel({});
    await apiClient.getSalesByStore({});
    await apiClient.getTimeSeries({});
    await apiClient.getCategories({});
    await apiClient.getFilters();
    await apiClient.getInsights({});
    await apiClient.getExchangeRates();

    // dashboards
    await apiClient.createDashboard({ name: 'x', layout: {} as any } as any);
    await apiClient.getDashboards();
    await apiClient.getDashboard(1);
    await apiClient.updateDashboard(1, { name: 'y' });

    // delete returns void
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await apiClient.deleteDashboard(1);

    // shared dashboard
    await apiClient.getSharedDashboard('share');

    expect(fetchMock).toHaveBeenCalled();
  });
});

