import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { Layout } from '@/components/Layout';

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Alice Doe', email: 'alice@example.com' }, logout: vi.fn() })
}));

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-05-01', endDate: '2025-05-31' },
    setDateRange: vi.fn(), setChannel: vi.fn(), setStore: vi.fn(),
  })
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('Layout help center modal', () => {
  it('opens Central de Ajuda and allows copy/open actions', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);
    const writeText = vi.fn().mockResolvedValue(undefined);
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(withAllProviders(<Layout><div>child</div></Layout>));

    // open user menu
    const userToggle = screen.getAllByRole('button').find(b => b.getAttribute('aria-controls') === 'user-menu')!;
    fireEvent.click(userToggle);
    // open help
    const help = screen.getByRole('menuitem', { name: /Central de Ajuda/i });
    fireEvent.click(help);

    const dlg = screen.getByRole('dialog', { name: /Central de Ajuda/i });
    expect(dlg).toBeInTheDocument();

    // open email link
    const emailOpen = screen.getAllByRole('button', { name: /Enviar e-mail/i })[0];
    fireEvent.click(emailOpen);
    // copy email
    const emailCopy = screen.getAllByRole('button', { name: /Copiar e-mail/i })[0];
    fireEvent.click(emailCopy);

    // open whatsapp
    const waOpen = screen.getAllByRole('button', { name: /Abrir WhatsApp/i })[0];
    fireEvent.click(waOpen);
    // copy phone
    const telCopy = screen.getAllByRole('button', { name: /Copiar telefone/i })[0];
    fireEvent.click(telCopy);

    expect(openSpy).toHaveBeenCalled();
    expect(writeText).toHaveBeenCalled();

    // close modal by footer button
    const closeBtn = screen.getByRole('button', { name: /Fechar ajuda/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: /Central de Ajuda/i })).toBeNull();

    openSpy.mockRestore();
  });

  it('closes help modal by backdrop click and footer button', () => {
    render(withAllProviders(<Layout><div>child</div></Layout>));

    const userToggle = screen.getAllByRole('button').find(b => b.getAttribute('aria-controls') === 'user-menu')!;
    fireEvent.click(userToggle);
    fireEvent.click(screen.getByRole('menuitem', { name: /Central de Ajuda/i }));

    const dlg = screen.getByRole('dialog', { name: /Central de Ajuda/i });
    fireEvent.click(dlg);
    expect(screen.queryByRole('dialog', { name: /Central de Ajuda/i })).toBeNull();

    fireEvent.click(userToggle);
    fireEvent.click(screen.getByRole('menuitem', { name: /Central de Ajuda/i }));
    fireEvent.click(screen.getByRole('button', { name: /Fechar ajuda/i }));
    expect(screen.queryByRole('dialog', { name: /Central de Ajuda/i })).toBeNull();
  });
});


