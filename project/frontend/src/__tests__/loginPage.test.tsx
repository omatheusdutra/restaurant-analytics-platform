import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { LoginPage } from '@/pages/LoginPage';

const loginMock = vi.fn().mockResolvedValue(undefined);
const registerMock = vi.fn().mockResolvedValue(undefined);
const clearErrorMock = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    login: loginMock,
    register: registerMock,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    clearError: clearErrorMock,
  })
}));

describe('LoginPage', () => {
  it('submits login form', async () => {
    render(withAllProviders(<LoginPage />));
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(loginMock).toHaveBeenCalledWith('a@b.com', '123456');
  });

  it('switches to registration and submits', async () => {
    render(withAllProviders(<LoginPage />));
    fireEvent.click(screen.getByRole('button', { name: /Switch to registration/i }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(registerMock).toHaveBeenCalledWith('a@b.com', '123456', 'Alice');
  });
});
