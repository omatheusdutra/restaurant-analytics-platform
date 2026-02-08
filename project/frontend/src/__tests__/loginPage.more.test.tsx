import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';

describe('LoginPage extra branches', () => {
  it('redirects to /dashboard when authenticated', async () => {
    const navigate = vi.fn();
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual<any>('react-router-dom');
      return { ...actual, useNavigate: () => navigate };
    });
    vi.doMock('@/store/authStore', () => ({
      useAuthStore: () => ({ login: vi.fn(), register: vi.fn(), isLoading: false, error: null, isAuthenticated: true, clearError: vi.fn() })
    }));
    const { LoginPage: Page } = await import('@/pages/LoginPage');
    render(withAllProviders(<Page />));
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('handles failed submit (catch path) without crashing', async () => {
    const error = new Error('boom');
    const loginMock = vi.fn().mockRejectedValue(error);
    vi.doMock('@/store/authStore', () => ({
      useAuthStore: () => ({ login: loginMock, register: vi.fn(), isLoading: false, error: null, isAuthenticated: false, clearError: vi.fn() })
    }));
    const { LoginPage: Page } = await import('@/pages/LoginPage');
    render(withAllProviders(<Page />));
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    // Apenas garante que a tela permanece estável após submit com erro
    await new Promise(r => setTimeout(r, 0));
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });
});
