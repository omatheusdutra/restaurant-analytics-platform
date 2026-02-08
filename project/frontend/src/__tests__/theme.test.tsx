import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const Probe: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <button onClick={toggleTheme}>toggle</button>
      <span>{theme}</span>
    </div>
  );
};

describe('ThemeContext', () => {
  it('toggles theme and writes class/localStorage', () => {
    document.documentElement.className = '';
    localStorage.removeItem('theme');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    fireEvent.click(screen.getByText('toggle'));
    expect(document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('light')).toBe(true);
    expect(localStorage.getItem('theme')).toBeTruthy();
  });
});

