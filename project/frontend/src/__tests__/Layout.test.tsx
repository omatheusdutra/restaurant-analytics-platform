import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Layout } from '@/components/Layout';
import { withAllProviders } from '@/test/utils';

const logoutSpy = vi.fn();
vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Alice Doe', email: 'alice@example.com' }, logout: logoutSpy })
}));

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-05-01', endDate: '2025-05-31' },
    setDateRange: vi.fn(), setChannel: vi.fn(), setStore: vi.fn()
  })
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() })
}));

describe('Layout', () => {
  it('opens and closes Menu by outside click', () => {
    render(withAllProviders(<Layout><div>child</div></Layout>));

    const btns = screen.getAllByRole('button', { name: /menu/i });
    const btn = btns.find(b => b.getAttribute('aria-controls') === 'quick-actions-menu') as HTMLButtonElement;
    fireEvent.click(btn);
    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes Menu with Escape', () => {
    render(withAllProviders(<Layout><div>child</div></Layout>));

    const btns = screen.getAllByRole('button', { name: /menu/i });
    const btn = btns.find(b => b.getAttribute('aria-controls') === 'quick-actions-menu') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens Favorites modal and saves a favorite', () => {
    // limpa favoritos
    localStorage.removeItem('ri:filterFavorites');
    render(withAllProviders(<Layout><div>child</div></Layout>));

    // abre Menu
    const btns = screen.getAllByRole('button', { name: /menu/i });
    const btn = btns.find(b => b.getAttribute('aria-controls') === 'quick-actions-menu') as HTMLButtonElement;
    fireEvent.click(btn);
    // abre Insights (antigo Favoritos)
    fireEvent.click(screen.getByRole('menuitem', { name: /Favoritos \(salvar filtros\)/i }));

    // Modal aparece
    const dlg = screen.getByRole('dialog');
    expect(dlg).toBeInTheDocument();

    // Preenche nome e salva
    const input = screen.getByLabelText(/Nome do favorito/i);
    fireEvent.change(input, { target: { value: 'Meu Filtro' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar filtros atuais/i }));

    // Aparece na lista
    expect(screen.getByText('Meu Filtro')).toBeInTheDocument();
  });

  it('toggles theme, exports PDF, copies link via fallback, and logs out', async () => {
    const origClipboard: any = navigator.clipboard;
    // @ts-ignore force fallback path
    navigator.clipboard = undefined as any;
    // @ts-ignore
    document.execCommand = vi.fn(() => true);
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(withAllProviders(<Layout><div>child</div></Layout>));

    // theme toggle
    const themeBtn = screen.getByRole('button', { name: /Switch to dark mode|Switch to light mode/i });
    fireEvent.click(themeBtn);

    // open Menu and export PDF
    const btns = screen.getAllByRole('button', { name: /menu/i });
    const btn = btns.find(b => b.getAttribute('aria-controls') === 'quick-actions-menu') as HTMLButtonElement;
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('menuitem', { name: /Exportar PDF/ }));
    expect(printSpy).toHaveBeenCalled();

    // open Menu and copy link (fallback)
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('menuitem', { name: /Copiar link/ }));
    expect(document.execCommand).toHaveBeenCalled();

    // open user dropdown and logout (desktop)
    const userBtns = screen.getAllByRole('button');
    const userToggle = userBtns.find(b => b.getAttribute('aria-controls') === 'user-menu') as HTMLButtonElement;
    if (userToggle) fireEvent.click(userToggle);
    const logoutBtn = screen.queryByRole('menuitem', { name: /Logout|Sair/i });
    if (logoutBtn) fireEvent.click(logoutBtn);
    expect(logoutSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
    alertSpy.mockRestore();
    navigator.clipboard = origClipboard;
  });
});



