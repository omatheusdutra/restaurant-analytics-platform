import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '@/App';

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: false,
    initialize: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe('App routes', () => {
  beforeEach(() => {
    // reset to root for each test
    window.history.pushState({}, '', '/');
  });

  it('redirects "/" to /login when not authenticated', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Restaurant Intelligence/i })).toBeInTheDocument();
  });

  it('redirects protected route to /login when not authenticated', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByRole('button', { name: /Entrar|Criar conta/i })).toBeInTheDocument();
  });
});
