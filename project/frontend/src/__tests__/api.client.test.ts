import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/api/client';

const fetchMock = vi.fn();

describe('apiClient', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global as any).fetch = fetchMock;
    // default ok response
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    localStorage.clear();
    apiClient.setToken(null);
  });

  it('sets and clears token and sends Authorization header', async () => {
    // set token via register/login response
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 't', user: { id: 1, email: 'e', name: 'n' } }) });
    await apiClient.login('e', 'p');
    expect(localStorage.getItem('token')).toBe('t');

    // next request should include Authorization
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    await apiClient.getProfile();
    const lastCall = fetchMock.mock.calls.at(-1) as any[];
    expect(lastCall[1].headers['Authorization']).toBe('Bearer t');

    apiClient.setToken(null);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('propagates non-ok responses as Error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Bad' }), status: 400 });
    await expect(apiClient.getProfile()).rejects.toThrow('Bad');
  });

  it('calls write endpoints with correct method/body', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 't', user: { id: 1, email: 'e', name: 'n' } }) });
    await apiClient.register('e','p','n');
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toMatch(/\/api\/auth\/register$/);
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBeTruthy();
  });
});

