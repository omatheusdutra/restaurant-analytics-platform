import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { withAllProviders } from '@/test/utils';
import { Layout } from '@/components/Layout';

const setDateRange = vi.fn();
const setChannel = vi.fn();
const setStore = vi.fn();

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ user: { name: 'Alice Doe', email: 'alice@example.com' }, logout: vi.fn() })
}));

vi.mock('@/store/filterStore', () => ({
  useFilterStore: () => ({
    filters: { startDate: '2025-05-01', endDate: '2025-05-31', channelId: '1', storeId: '2' },
    setDateRange, setChannel, setStore,
  })
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

describe('Layout additional branches', () => {
  it('copies link via clipboard API success path', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const origClipboard: any = navigator.clipboard;
    // @ts-ignore
    navigator.clipboard = { writeText } as any;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(withAllProviders(<Layout><div>child</div></Layout>));
    // Use quick actions menu (desktop)
    const menuBtn = screen.getAllByRole('button', { name: /menu/i })[0];
    fireEvent.click(menuBtn);
    const copyItem = screen.getByRole('menuitem', { name: /Copiar link com filtros/i });
    fireEvent.click(copyItem);
    // allow async handler to resolve
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
    navigator.clipboard = origClipboard;
  });

  it('mobile menu opens and triggers items', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(withAllProviders(<Layout><div>child</div></Layout>));
    const toggle = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(toggle);
    // navigate to dashboard item
    const goDash = screen.getByRole('menuitem', { name: /In[ií]cio/i });
    fireEvent.click(goDash);
    // reopen and export PDF
    fireEvent.click(toggle);
    const exportBtn = screen.getByRole('menuitem', { name: /Exportar PDF/i });
    fireEvent.click(exportBtn);
    fireEvent.click(toggle);
    printSpy.mockRestore();
  });

  it('favorites apply and delete flows', () => {
    render(withAllProviders(<Layout><div>child</div></Layout>));
    const tools = screen.getAllByRole('button', { name: /menu/i })[0];
    fireEvent.click(tools);
    fireEvent.click(screen.getByRole('menuitem', { name: /Favoritos \(salvar filtros\)/i }));

    // save current filters as favorite named X
    fireEvent.change(screen.getByLabelText(/Nome do favorito/i), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar filtros atuais/i }));
    // row reference and apply
    const row = screen.getByText('X').closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: /Aplicar/i }));
    expect(setDateRange).toHaveBeenCalled();
    expect(setChannel).toHaveBeenCalled();
    expect(setStore).toHaveBeenCalled();
    // modal closes after apply, reopen and delete
    fireEvent.click(tools);
    fireEvent.click(screen.getByRole('menuitem', { name: /Favoritos \(salvar filtros\)/i }));
    const row2 = screen.getByText('X').closest('li')!;
    fireEvent.click(within(row2).getByRole('button', { name: /Excluir/i }));
  });
});





