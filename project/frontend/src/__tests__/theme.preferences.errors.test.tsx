import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTheme } from '@/contexts/ThemeContext';

function UsePrefsOutside() {
  // this should throw
  // @ts-ignore
  usePreferences();
  return null;
}
function UseThemeOutside() {
  // @ts-ignore
  useTheme();
  return null;
}

describe('Context error branches', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let windowErrorHandler: ((event: ErrorEvent) => void) | null = null;

  beforeAll(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined as any);
    windowErrorHandler = (event: ErrorEvent) => {
      event.preventDefault();
    };
    window.addEventListener('error', windowErrorHandler);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
    if (windowErrorHandler) {
      window.removeEventListener('error', windowErrorHandler);
    }
  });

  it('usePreferences throws outside provider', () => {
    // render component calling hook outside provider to hit throw
    expect(() => render(<UsePrefsOutside />)).toThrow();
  });
  it('useTheme throws outside provider', () => {
    expect(() => render(<UseThemeOutside />)).toThrow();
  });
});
