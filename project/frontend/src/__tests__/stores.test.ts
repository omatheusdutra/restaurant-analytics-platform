import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { useFilterStore } from '@/store/filterStore';

vi.mock('@/api/client', () => ({
  apiClient: {
    login: vi.fn().mockResolvedValue({ token: 't', user: { id: 1, email: 'a@b.com', name: 'A' } }),
    updateProfile: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com', name: 'B' }),
    register: vi.fn().mockResolvedValue({ token: 't', user: { id: 1, email: 'a@b.com', name: 'A' } }),
    getProfile: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com', name: 'A' }),
    setToken: vi.fn(),
  }
}));

describe('stores', () => {
  beforeEach(() => { localStorage.clear(); });

  it('authStore login/update/logout flow', async () => {
    const s = useAuthStore.getState();
    await s.login('a@b.com','x');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    await s.updateName('B');
    expect(useAuthStore.getState().user?.name).toBe('B');
    s.logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('filterStore set/reset and query params', () => {
    const f = useFilterStore.getState();
    f.setDateRange('2025-01-01','2025-01-31');
    f.setChannel('9');
    f.setStore('5');

    const qp = f.getQueryParams();
    expect(qp).toMatchObject({ startDate: '2025-01-01', endDate: '2025-01-31', channelId: '9', storeId: '5' });

    f.resetFilters();
    const after = useFilterStore.getState().filters;

    expect(after.channelId).toBeUndefined();
    expect(after.storeId).toBeUndefined();
    expect(after.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(after.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const start = new Date(`${after.startDate}T00:00:00.000Z`);
    const end = new Date(`${after.endDate}T00:00:00.000Z`);
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    expect(diffDays).toBe(30);
  });
});
