import { describe, it, expect } from 'vitest';
import { formatDateHelper } from '@/pages/DashboardPage';

describe('formatDateHelper', () => {
  it('returns ISO when dateFormat is yyyy-MM-dd', () => {
    expect(formatDateHelper('yyyy-MM-dd', '2025-02-03T12:00:00Z')).toBe('2025-02-03');
  });
  it('returns dd/MM/yyyy when using default format', () => {
    expect(formatDateHelper('dd/MM/yyyy', '2025-02-03T12:00:00Z')).toBe('03/02/2025');
  });
  
  // ISO-like string branch (yyyy-MM-dd without time) should bypass timezone parsing
  it('handles ISO-like input without timezone drift (yyyy-MM-dd)', () => {
    expect(formatDateHelper('yyyy-MM-dd', '2025-10-09')).toBe('2025-10-09');
  });
  it('handles ISO-like input to dd/MM/yyyy', () => {
    expect(formatDateHelper('dd/MM/yyyy', '2025-10-09')).toBe('09/10/2025');
  });
  it('returns input when invalid date', () => {
    expect(formatDateHelper('dd/MM/yyyy', 'invalid-date')).toBe('invalid-date');
  });
});
