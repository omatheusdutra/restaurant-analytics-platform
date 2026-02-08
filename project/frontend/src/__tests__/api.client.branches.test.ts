import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/api/client';

describe('apiClient branches', () => {
  const originalFetch = global.fetch!;

  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.setToken(null);
  });

  it('adds Authorization header when token is set', async () => {
    apiClient.setToken('abc');
    const json = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json }) as any;
    await apiClient.getOverview({});
    expect(global.fetch).toHaveBeenCalled();
    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.headers.Authorization).toMatch(/Bearer abc/);
  });

  it('request error uses JSON error message when available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ error: 'Bad' })
    }) as any;
    await expect(apiClient.getOverview({})).rejects.toThrow('Bad');
  });

  it('request error falls back when response.json fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('boom'))
    }) as any;
    await expect(apiClient.getOverview({})).rejects.toThrow('Request failed');
  });

  it('exportCSV throws on non-ok response', async () => {
    apiClient.setToken('abc');
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(apiClient.exportCSV({})).rejects.toThrow('Failed to export CSV');
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });
});

