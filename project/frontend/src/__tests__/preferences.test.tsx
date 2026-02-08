import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreferencesProvider, usePreferences } from '@/contexts/PreferencesContext';

const Probe: React.FC = () => {
  const p = usePreferences();
  return (
    <div>
      <button onClick={() => p.setCurrency('USD')}>setUSD</button>
      <button onClick={() => p.setDateFormat('yyyy-MM-dd')}>setISO</button>
      <span>{p.currency}-{p.dateFormat}</span>
    </div>
  );
};

describe('PreferencesContext', () => {
  it('changes currency and date format and writes to localStorage', () => {
    render(<PreferencesProvider><Probe /></PreferencesProvider>);
    fireEvent.click(screen.getByText('setUSD'));
    fireEvent.click(screen.getByText('setISO'));
    expect(screen.getByText('USD-yyyy-MM-dd')).toBeInTheDocument();
    expect(localStorage.getItem('ri:currency')).toBe('USD');
    expect(localStorage.getItem('ri:dateFormat')).toBe('yyyy-MM-dd');
  });

  it('falls back to safe defaults when localStorage has invalid values', () => {
    localStorage.setItem('ri:currency', 'BRL -- Real');
    localStorage.setItem('ri:dateFormat', 'DD/MM/YYYY');
    render(<PreferencesProvider><Probe /></PreferencesProvider>);
    expect(screen.getByText('BRL-dd/MM/yyyy')).toBeInTheDocument();
  });
});
