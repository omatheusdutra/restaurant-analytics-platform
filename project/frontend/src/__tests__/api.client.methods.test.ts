import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/api/client';

describe('apiClient specific methods', () => {
  const originalFetch = global.fetch!;

  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.setToken('tok');
  });

  it('updateProfile sends PUT with body and returns user', async () => {
    const user = { id: 1, name: 'Bob', email: 'b@b.com' };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(user) }) as any;
    const res = await apiClient.updateProfile('Bob');
    expect(res).toEqual(user);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/profile$/);
    expect(init.method).toBe('PUT');
    expect(init.body).toContain('Bob');
  });

  it('changePassword posts payload and returns success', async () => {
    const payload = { success: true };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue(payload) }) as any;
    const res = await apiClient.changePassword('old', 'new');
    expect(res).toEqual(payload);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/change-password$/);
    expect(init.method).toBe('POST');
    expect(init.body).toContain('new');
  });

  afterAll(() => { global.fetch = originalFetch; });
});

