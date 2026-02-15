import { parseDateRange } from '@/controllers/metricsController';

describe('parseDateRange', () => {
  it('uses defaults when no params provided', () => {
    const range = parseDateRange(undefined, undefined);
    expect(range.start instanceof Date).toBe(true);
    expect(range.end instanceof Date).toBe(true);
  });

  it('accepts only startDate', () => {
    const r = parseDateRange('2024-01-01', undefined);
    expect(r.start.toISOString().startsWith('2024-01-01')).toBe(true);
    expect(r.end instanceof Date).toBe(true);
  });

  it('accepts only endDate', () => {
    const r = parseDateRange(undefined, '2024-12-31');
    expect(r.end.toISOString().startsWith('2024-12-31')).toBe(true);
    expect(r.start instanceof Date).toBe(true);
  });

  it('accepts both startDate and endDate', () => {
    const r = parseDateRange('2024-01-01', '2024-01-31');
    expect(r.start.toISOString().startsWith('2024-01-01')).toBe(true);
    expect(r.end.toISOString().startsWith('2024-01-31')).toBe(true);
  });

  it('falls back for invalid dates and swaps when start is after end', () => {
    const invalid = parseDateRange('not-a-date', 'also-bad');
    expect(invalid.start instanceof Date).toBe(true);
    expect(invalid.end instanceof Date).toBe(true);

    const swapped = parseDateRange('2024-02-10', '2024-02-01');
    expect(swapped.start.toISOString().startsWith('2024-02-01')).toBe(true);
    expect(swapped.end.toISOString().startsWith('2024-02-10')).toBe(true);
  });
});