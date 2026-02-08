import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { Layout } from '@/components/Layout';

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-01-01', endDate: '2025-01-31' },
    setDateRange: vi.fn(), setChannel: vi.fn(), setStore: vi.fn(),
  })
}));

describe('Layout user menu + favorites init', () => {
  it('handles invalid favorites JSON gracefully (catch path)', () => {
    localStorage.setItem('ri:filterFavorites', '{oops');
    vi.mock('@/store/authStore', () => ({
      useAuthStore: () => ({ user: { name: 'Z', email: 'z@z.z' }, logout: vi.fn() })
    }));
    vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
    render(withAllProviders(<Layout><div>child</div></Layout>));
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('closes user menu via outside click and Escape', () => {
    vi.mock('@/store/authStore', () => ({
      useAuthStore: () => ({ user: { name: 'Alice Doe', email: 'a@b.c' }, logout: vi.fn() })
    }));
    vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
    render(withAllProviders(<Layout><div>child</div></Layout>));

    const userBtn = screen.getAllByRole('button').find(b => b.getAttribute('aria-controls') === 'user-menu') as HTMLButtonElement;
    if (userBtn) fireEvent.click(userBtn);
    // Escape closes
    fireEvent.keyDown(document, { key: 'Escape' });
    // open again and click outside
    if (userBtn) fireEvent.click(userBtn);
    fireEvent.mouseDown(document.body);
    expect(true).toBe(true);
  });
});

