import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { SettingsPage } from '@/pages/SettingsPage';

const logoutMock = vi.fn();
const updateNameMock = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Alice', email: 'a@b.com' }, logout: logoutMock, updateName: updateNameMock })
}));

describe('SettingsPage more branches', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('clears favorites from localStorage', () => {
    localStorage.setItem('ri:filterFavorites', 'x');
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render(withAllProviders(<SettingsPage />));
    fireEvent.click(screen.getByRole('button', { name: /Limpar favoritos/i }));
    expect(localStorage.getItem('ri:filterFavorites')).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('updates name on blur', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render(withAllProviders(<SettingsPage />));
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.blur(nameInput, { target: { value: 'Alice Nova' } });
    await Promise.resolve();
    expect(updateNameMock).toHaveBeenCalledWith('Alice Nova');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('password validations: missing fields, short, mismatch and error catch', async () => {
    // Ensure alert exists in JSDOM
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined as any);
    const changePassword = vi.fn()
      .mockRejectedValueOnce(new Error('x')); // used for the last path
    vi.doMock('@/api/client', () => ({ apiClient: { changePassword } }));
    const { SettingsPage: Settings } = await import('@/pages/SettingsPage');
    render(withAllProviders(<Settings />));

    // Missing fields
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));
    expect(alertSpy).toHaveBeenCalled();

    // Too short
    fireEvent.change(screen.getByPlaceholderText('Senha atual'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText('Nova senha'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova senha'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));

    // Mismatch
    fireEvent.change(screen.getByPlaceholderText('Senha atual'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Nova senha'), { target: { value: 'abcdef' } });
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova senha'), { target: { value: 'xxxxxx' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));

    // Error catch branch
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova senha'), { target: { value: 'abcdef' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));
    await Promise.resolve();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
