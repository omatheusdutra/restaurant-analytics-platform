import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { withAllProviders, withProviders } from '@/test/utils';
import App from '@/App';

vi.mock('react-dom/client', () => {
  const createRoot = vi.fn(() => ({ render: vi.fn() }));
  return { __esModule: true, default: { createRoot } };
});

describe('App and main entry', () => {
  it('renders App with routes without crashing', () => {
    // App já cria seu próprio Router internamente
    const { container } = render(withProviders(<App />));
    expect(container.firstChild).toBeTruthy();
  });

  it('executes main.tsx bootstrap', async () => {
    const origGet = document.getElementById;
    // @ts-ignore
    document.getElementById = () => ({}) as any;
    await import('@/main');
    const mod: any = (await import('react-dom/client')).default;
    expect(mod.createRoot).toHaveBeenCalled();
    document.getElementById = origGet;
  });
});
