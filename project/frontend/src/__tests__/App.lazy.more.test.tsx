import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { withProviders } from '@/test/utils';
import { render, screen } from '@testing-library/react';

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    initialize: vi.fn(),
  })
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() })
}));

// Route injector to avoid Router-in-Router by replacing BrowserRouter
let currentRoute = '/settings';
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

// Import App after mocks are set up
const App = (await import('@/App')).default;

describe('App lazy routes extra', () => {
  it('renders lazy fallback for /dashboard without crashing', async () => {
    currentRoute = '/dashboard';
    const { container } = render(withProviders(<App />));
    // Suspense fallback spinner should appear
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });
});
