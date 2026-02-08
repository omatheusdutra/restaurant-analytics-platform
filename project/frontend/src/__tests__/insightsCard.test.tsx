import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { InsightsCard } from '@/components/InsightsCard';

describe('InsightsCard', () => {
  it('renders empty state', () => {
    const { container } = render(<InsightsCard insights={[]} />);
    expect(container.textContent).toMatch(/Nenhum insight/);
  });

  it('renders items with priority styles', () => {
    render(
      <InsightsCard insights={[
        { type: 'summary', icon: '💡', title: 'High', description: 'd', priority: 'high' },
        { type: 'tip', icon: 'ℹ️', title: 'Medium', description: 'd', priority: 'medium' },
        { type: 'note', icon: '📝', title: 'Low', description: 'd', priority: 'low' },
        { type: 'other', icon: '❔', title: 'Default', description: 'd', priority: 'x' as any },
      ]} />
    );
    expect(screen.getByRole('article', { name: /High/ })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Medium/ })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Low/ })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Default/ })).toBeInTheDocument();
  });

  it('converts BRL amounts in description when currency is not BRL', () => {
    render(
      <InsightsCard
        insights={[
          {
            type: 'summary',
            icon: 'x',
            title: 'Resumo',
            description: 'Receita R$ 100,00 e ticket R$ 50,00',
            priority: 'high',
          },
        ]}
        currency='USD'
        fxRate={0.2}
      />
    );

    expect(screen.getByText(/US\$/)).toBeInTheDocument();
    expect(screen.getByText(/20,00/)).toBeInTheDocument();
  });

});
