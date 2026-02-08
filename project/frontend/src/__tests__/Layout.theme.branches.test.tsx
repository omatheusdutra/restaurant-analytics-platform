import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { Layout } from '@/components/Layout';

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Bob', email: 'bob@example.com' }, logout: vi.fn() })
}));

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-01-01', endDate: '2025-01-31' },
    setDateRange: vi.fn(), setChannel: vi.fn(), setStore: vi.fn(),
  })
}));

describe('Layout theme branches (mobile menu)', () => {
  it('renders dark theme branch', async () => {
    vi.resetModules();
    vi.doMock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));
    const { Layout: LayoutCmp } = await import('@/components/Layout');
    render(withAllProviders(<LayoutCmp><div>child</div></LayoutCmp>));
    // open mobile menu and assert label/icon branch (at least one label present)
    const toggle = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(toggle);
    expect(screen.getAllByLabelText('Switch to light mode').length).toBeGreaterThan(0);
  });

  it('renders light theme branch', async () => {
    vi.resetModules();
    vi.doMock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
    const { Layout: LayoutCmp } = await import('@/components/Layout');
    render(withAllProviders(<LayoutCmp><div>child</div></LayoutCmp>));
    const toggle = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(toggle);
    expect(screen.getAllByLabelText('Switch to dark mode').length).toBeGreaterThan(0);
  });
});
