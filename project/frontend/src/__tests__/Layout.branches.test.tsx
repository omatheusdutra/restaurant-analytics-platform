import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { Layout } from '@/components/Layout';

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-01-01', endDate: '2025-01-31' },
    setDateRange: vi.fn(), setChannel: vi.fn(), setStore: vi.fn(),
  })
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: '', email: 'x@y.z' }, logout: vi.fn() })
}));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }) }));

describe('Layout extra branches', () => {
  it('closes quick menu on window resize and shows ? initials when no name', async () => {
    render(withAllProviders(<Layout><div>child</div></Layout>));

    // initials fallback '?'
    expect(screen.getByText('?')).toBeInTheDocument();

    // open quick actions (desktop) then close via resize
    const toolsBtn = screen.getAllByRole('button', { name: /menu/i })[0];
    fireEvent.click(toolsBtn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    window.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });
});
