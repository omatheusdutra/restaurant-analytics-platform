import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';

const { getProfileMock } = vi.hoisted(() => ({
  getProfileMock: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    login: vi.fn().mockRejectedValue(new Error('bad login')),
    register: vi.fn().mockRejectedValue(new Error('bad register')),
    updateProfile: vi.fn().mockRejectedValue(new Error('bad update')),
    getProfile: getProfileMock,
    logout: vi.fn().mockResolvedValue({ success: true }),
    setToken: vi.fn(),
  }
}));

describe('authStore additional branches', () => {
  beforeEach(() => {
    getProfileMock.mockReset();
    getProfileMock.mockResolvedValue({ id: 1, email: 'a@b.com', name: 'A' });
  });

  it('initialize success and failure', async () => {
    const s = useAuthStore.getState();

    await s.initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    getProfileMock.mockRejectedValueOnce(new Error('no session'));
    await s.initialize();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clearError and error paths on login/register/update', async () => {
    const s = useAuthStore.getState();
    await expect(s.login('e','p')).rejects.toThrow('bad login');
    expect(useAuthStore.getState().error).toBeTruthy();
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();

    await expect(s.register('e','p','n')).rejects.toThrow('bad register');
    await expect(s.updateName('Z')).rejects.toThrow('bad update');
  });
});
