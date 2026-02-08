import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPage } from '@/pages/SettingsPage';
import { withAllProviders } from '@/test/utils';

const logoutMock = vi.fn();
const updateNameMock = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Alice', email: 'a@b.com' }, logout: logoutMock, updateName: updateNameMock })
}));

vi.mock('@/api/client', async () => {
  const actual = await vi.importActual<any>('@/api/client');
  return {
    ...actual,
    apiClient: { ...actual.apiClient, changePassword: vi.fn().mockResolvedValue({ success: true }) }
  };
});

describe('SettingsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('saves preferences and calls alerts', () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render(withAllProviders(<SettingsPage />));

    // Troca moeda e data (dois combobox na ordem)
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'USD' } });
    fireEvent.change(selects[1], { target: { value: 'yyyy-MM-dd' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar prefer/i }));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('changes password successfully', async () => {
    const spy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    render(withAllProviders(<SettingsPage />));

    fireEvent.change(screen.getByPlaceholderText('Senha atual'), { target: { value: '123456' } });
    fireEvent.change(screen.getByPlaceholderText('Nova senha'), { target: { value: 'abcdef' } });
    fireEvent.change(screen.getByPlaceholderText('Confirmar nova senha'), { target: { value: 'abcdef' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));
    await new Promise(r => setTimeout(r, 0));
    // Apenas valida que o fluxo chegou ao alert de sucesso
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logout button triggers logout', () => {
    render(withAllProviders(<SettingsPage />));
    fireEvent.click(screen.getByRole('button', { name: /Sair/i }));
    expect(logoutMock).toHaveBeenCalled();
  });
});
