const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args: any[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('React Router Future Flag Warning')) return;
  return originalWarn.apply(console, args as any);
};

console.error = (...args: any[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('not wrapped in act(')) return;
  if (msg.includes('usePreferences must be used within PreferencesProvider')) return;
  if (msg.includes('useTheme must be used within a ThemeProvider')) return;
  if (msg.includes('Not implemented: navigation')) return;
  if (msg.includes('Not implemented: window.alert')) return;
  return originalError.apply(console, args as any);
};

import React from 'react';
// Minimal ResizeObserver polyfill for chart components in tests
// @ts-ignore
if (!(global as any).ResizeObserver) {
  // @ts-ignore
  const RO = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // @ts-ignore
  (global as any).ResizeObserver = RO;
  // @ts-ignore
  (window as any).ResizeObserver = RO;
}
import '@testing-library/jest-dom';
// Silence jsdom not-implemented alert by providing a stub
import { vi } from 'vitest';
// @ts-ignore
(window as any).alert = vi.fn();

// Speed up tests: stub heavy UI libs (icons/charts)
vi.mock('lucide-react', () => {
  const MockIcon = (props: any) => React.createElement('svg', props);
  return {
    __esModule: true,
    Home: MockIcon,
    LogOut: MockIcon,
    Menu: MockIcon,
    X: MockIcon,
    Moon: MockIcon,
    Sun: MockIcon,
    FileDown: MockIcon,
    HelpCircle: MockIcon,
    Keyboard: MockIcon,
    BarChart3: MockIcon,
    Utensils: MockIcon,
    Settings: MockIcon,
    Puzzle: MockIcon,
    Lightbulb: MockIcon,
    Mail: MockIcon,
    Phone: MockIcon,
    ExternalLink: MockIcon,
    Copy: MockIcon,
    ChevronDown: MockIcon,
    DollarSign: MockIcon,
    ShoppingCart: MockIcon,
    Clock: MockIcon,
    TrendingUp: MockIcon,
    TrendingDown: MockIcon,
    Download: MockIcon,
    Percent: MockIcon,
    XCircle: MockIcon,
    CheckCircle2: MockIcon,
  };
});

vi.mock('recharts', () => {
  const Stub = ({ children }: any) => (children ? children : null);
  return {
    __esModule: true,
    ResponsiveContainer: Stub,
    LineChart: Stub,
    Line: Stub,
    CartesianGrid: Stub,
    XAxis: Stub,
    YAxis: Stub,
    Tooltip: Stub,
    Legend: Stub,
    BarChart: Stub,
    Bar: Stub,
    PieChart: Stub,
    Pie: Stub,
    Cell: Stub,
  };
});
