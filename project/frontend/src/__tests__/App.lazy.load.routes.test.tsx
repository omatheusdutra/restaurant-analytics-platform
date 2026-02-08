import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import App from '@/App';

// Simulate authenticated user so ProtectedRoute allows access
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true, initialize: vi.fn() }),
}));

// Replace BrowserRouter with MemoryRouter to control the route
let currentRoute = '/dashboard';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: any) => (
      <actual.MemoryRouter initialEntries={[currentRoute]}>
        {children}
      </actual.MemoryRouter>
    ),
  } as any;
});

// Mock the lazily loaded modules to light stubs (exercising the lazy import lines)
vi.mock('@/pages/DashboardPage', () => ({ DashboardPage: () => <div>__DASH__</div> }));
vi.mock('@/pages/SettingsPage', () => ({ SettingsPage: () => <div>__SETT__</div> }));
vi.mock('@/pages/ExplorePage', () => ({ ExplorePage: () => <div>__EXPL__</div> }));
vi.mock('@/components/Layout', () => ({ Layout: ({ children }: any) => <div>__LAYOUT__{children}</div> }));

describe('App lazy load routes', () => {
  it('loads /dashboard chunk', async () => {
    currentRoute = '/dashboard';
    const { findByText } = render(<App />);
    expect(await findByText(/__DASH__/)).toBeInTheDocument();
  });

  it('loads /settings chunk', async () => {
    currentRoute = '/settings';
    const { findByText } = render(<App />);
    expect(await findByText(/__SETT__/)).toBeInTheDocument();
  });

  it('loads /explore chunk', async () => {
    currentRoute = '/explore';
    const { findByText } = render(<App />);
    expect(await findByText(/__EXPL__/)).toBeInTheDocument();
  });
});
