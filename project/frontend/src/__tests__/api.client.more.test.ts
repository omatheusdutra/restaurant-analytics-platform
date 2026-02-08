import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/api/client';

const fetchMock = vi.fn();

describe('apiClient extra branches', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global as any).fetch = fetchMock;
    localStorage.clear();
    apiClient.setToken(null);
  });

  it('non-ok with non-JSON body falls back to generic error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('bad json'); }, status: 500 });
    await expect(apiClient.getProfile()).rejects.toThrow('Request failed');
  });

  it('exportCSV ok and non-ok paths', async () => {
    const blob = new Blob(['id']);
    // ok path
    fetchMock.mockResolvedValueOnce({ ok: true, blob: async () => blob });
    const b = await apiClient.exportCSV({ a: '1' });
    expect(b).toBeInstanceOf(Blob);

    // error path
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(apiClient.exportCSV()).rejects.toThrow('Failed to export CSV');
  });

  it('dashboards CRUD endpoints call request()', async () => {
    // generic ok json
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 1, name: 'd', isPublic: false, layout: {}, createdAt: '', updatedAt: '' }) });
    await apiClient.createDashboard({ name: 'x' });
    await apiClient.getDashboards();
    await apiClient.getDashboard(1);
    await apiClient.updateDashboard(1, { name: 'y' });
    // delete returns void
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await apiClient.deleteDashboard(1);
    // shared
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 2, name: 's', isPublic: true, layout: {}, createdAt: '', updatedAt: '' }) });
    await apiClient.getSharedDashboard('token');
    expect(fetchMock).toHaveBeenCalled();
  });
});

