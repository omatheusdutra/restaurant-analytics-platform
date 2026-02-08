import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { Layout } from '@/components/Layout';

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Alice Doe', email: 'alice@example.com' }, logout: vi.fn() })
}));

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-05-01', endDate: '2025-05-31' },
    setDateRange: vi.fn(), setChannel: vi.fn(), setStore: vi.fn(),
  })
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('Layout accessible names', () => {
  it('shows Insights and a separate Favoritos item', () => {
    render(withAllProviders(<Layout><div>child</div></Layout>));

    const btns = screen.getAllByRole('button', { name: /menu/i });
    const btn = btns.find(b => b.getAttribute('aria-controls') === 'quick-actions-menu') as HTMLButtonElement;
    fireEvent.click(btn);

    const insightsItem = screen.getByRole('menuitem', { name: /Insights/i });
    const fav = screen.getByRole('menuitem', { name: /Favoritos \(salvar filtros\)/i });
    expect(insightsItem).toBeInTheDocument();
    expect(fav).toBeInTheDocument();
  });
});
