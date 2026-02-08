import React, { ReactNode, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from "@tanstack/react-query";
import { useFilterStore } from '@/store/filterStore';
import { useAuthStore } from '@/store/authStore';
import {
  Home as HomeIcon,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  FileDown,
  HelpCircle,
  Keyboard,
  BarChart3,
  Utensils,
  Settings,
  Puzzle,
  
  Lightbulb,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { filters, setDateRange, setChannel, setStore } = useFilterStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleGoHome = () => {
    setIsQuickOpen(false);
    setShowFavorites(false);
    setIsUserOpen(false);
    setIsMobileMenuOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    navigate("/dashboard");
  };

  const goToDashboardSection = (section: "insights" | "channels") => {
    const hash = `#${section}`;
    const targetId = section === "insights" ? "insights-section" : "channels-section";
    setIsQuickOpen(false);
    setIsMobileMenuOpen(false);

    if (location.pathname !== "/dashboard") {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/dashboard${hash}`);
      return;
    }

    if (location.hash !== hash) {
      navigate(`/dashboard${hash}`);
      return;
    }

    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Quick actions menu state
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favName, setFavName] = useState("");
  const [favorites, setFavorites] = useState<Array<{ name: string; filters: any }>>(() => {
    try {
      const raw = localStorage.getItem('ri:filterFavorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Close tools dropdown on outside click or Escape
  const toolsRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  useEffect(() => {
    if (!isQuickOpen) return;
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      /* c8 ignore next */
      if (!toolsRef.current) return;
      if (!toolsRef.current.contains(e.target as Node)) {
        setIsQuickOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsQuickOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [isQuickOpen]);

  // Outside click/ESC for user menu
  useEffect(() => {
    if (!isUserOpen) return;
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      /* c8 ignore next */
      if (!userRef.current) return;
      if (!userRef.current.contains(e.target as Node)) {
        setIsUserOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [isUserOpen]);

  // Close dropdown when route changes
  useEffect(() => {
    setIsQuickOpen(false);
    setShowFavorites(false);
    setIsUserOpen(false);
  }, [location.pathname, location.search]);

  // Close dropdown on scroll/resize for better UX
  useEffect(() => {
    if (!isQuickOpen) return;
    const close = () => setIsQuickOpen(false);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close as any);
      window.removeEventListener('resize', close);
    };
  }, [isQuickOpen]);

  /* c8 ignore start */
  const handleExportPdf = () => {
    // Export the current view using browser print-to-PDF
    setIsQuickOpen(false);
    window.print();
  };

  const handleCopyLink = async () => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.channelId) params.set('channelId', filters.channelId);
    if (filters.storeId) params.set('storeId', filters.storeId);
    const url = `${window.location.origin}/dashboard?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copiado para a area de transferencia');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      alert('Link copiado');
    }
    setIsQuickOpen(false);
  };

  const saveFavorite = () => {
    if (!favName.trim()) { alert("De um nome ao favorito"); return; }
    const next = [...favorites.filter(f => f.name !== favName.trim()), { name: favName.trim(), filters }];
    setFavorites(next);
    localStorage.setItem('ri:filterFavorites', JSON.stringify(next));
    setFavName("");
  };
  
  /* c8 ignore start */
  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) || "";
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  };
  /* c8 ignore stop */

  const applyFavorite = (f: {name: string; filters: any}) => {
    const fv = f.filters;
    if (fv.startDate && fv.endDate) setDateRange(fv.startDate, fv.endDate);
    setChannel(fv.channelId);
    setStore(fv.storeId);
    setShowFavorites(false);
  };

  const deleteFavorite = (name: string) => {
    const next = favorites.filter(f => f.name !== name);
    setFavorites(next);
    localStorage.setItem('ri:filterFavorites', JSON.stringify(next));
  };
  /* c8 ignore stop */

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Navbar */}
      <nav
        className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-md shadow-sm border-b border-white/40 dark:border-gray-700"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <Utensils className="w-6 h-6 text-primary-600" aria-hidden="true" />
                <span className="ml-2 text-20 font-bold text-gray-900 dark:text-white">
                  Restaurant Intelligence
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={handleGoHome}
                className="flex items-center px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                aria-label="Inicio"
              >
                <HomeIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                Inicio
              </button>

              {/* Tools dropdown (replaces Docs) */}
              <div className="relative" ref={toolsRef}>
                <button
                  onClick={() => setIsQuickOpen((v) => !v)}
                  className="flex items-center px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={isQuickOpen}
                  aria-controls="quick-actions-menu"
                >
                  <Menu className="w-5 h-5 mr-2" aria-hidden="true" />
                  Menu
                </button>
                {isQuickOpen && (
                  <div
                    id="quick-actions-menu"
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                  >
                    <button onClick={handleExportPdf} className="w-full text-left px-4 py-2 text-14 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" role="menuitem">
                      <FileDown className="w-4 h-4 mr-2" aria-hidden="true" /> Exportar PDF do dashboard atual
                    </button>
                    <button onClick={() => goToDashboardSection("insights")} className="w-full text-left px-4 py-2 text-14 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" role="menuitem" aria-label="Insights">
                      <Lightbulb className="w-4 h-4 mr-2" aria-hidden="true" /> Insights
                    </button>
                    <button onClick={() => { navigate('/explore'); setIsQuickOpen(false); }} className="w-full text-left px-4 py-2 text-14 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" role="menuitem" aria-label="Explorar">
                      <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" /> Explorar dados
                    </button>
                    <button onClick={() => { setShowFavorites(true); setIsQuickOpen(false); }} className="w-full text-left px-4 py-2 text-14 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" role="menuitem" aria-label="Favoritos (salvar filtros)">
                      <Keyboard className="w-4 h-4 mr-2" aria-hidden="true" /> Favoritos (salvar filtros)
                    </button>
                    <button onClick={() => { handleCopyLink(); setIsQuickOpen(false); }} className="w-full text-left px-4 py-2 text-14 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" role="menuitem">
                      <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" /> Copiar link com filtros
                    </button>
                    <button onClick={() => goToDashboardSection("channels")} className="w-full text-left px-4 py-2 text-14 flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" role="menuitem">
                      <BarChart3 className="w-4 h-4 mr-2" aria-hidden="true" /> Performance por Canal
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={toggleTheme}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5" aria-hidden="true" />
                )}
              </button>

              {/* User dropdown */}
              <div className="relative ml-6 pl-6 border-l dark:border-gray-700" ref={userRef}>
                <button
                  onClick={() => setIsUserOpen((v) => !v)}
                  className="flex items-center gap-3 group"
                  aria-haspopup="menu"
                  aria-expanded={isUserOpen}
                  aria-controls="user-menu"
                >
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary-600/10 text-primary-700 dark:bg-primary-400/20 dark:text-primary-300 text-14 font-semibold">{getInitials(user?.name)}</span>
                  <div className="text-left">
                    <div className="text-16 font-medium text-gray-900 dark:text-white group-hover:text-primary-600">
                      {user?.name}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-14">{user?.email}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                {isUserOpen && (
                  <div
                    id="user-menu"
                    role="menu"
                    className="absolute right-0 mt-2 w-64 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                  >
                    <div className="px-4 py-3 border-b dark:border-gray-700">
                      <div className="text-16 font-semibold text-gray-900 dark:text-white">{user?.name}</div>
                      <div className="text-14 text-gray-500 dark:text-gray-400">{user?.email}</div>
                    </div>
                    <button className="w-full text-left px-4 py-2 text-14 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center" role="menuitem" onClick={() => { setIsUserOpen(false); navigate('/settings'); }}>
                      <Settings className="w-4 h-4 mr-2" /> Configuracoes
                    </button>
                    <button className="w-full text-left px-4 py-2 text-14 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center" role="menuitem" onClick={() => alert("Apps & Integracoes em breve")}>
                      <Puzzle className="w-4 h-4 mr-2" /> Apps & Integracoes
                    </button>
                    <button className="w-full text-left px-4 py-2 text-14 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center" role="menuitem" onClick={() => { setIsUserOpen(false); setIsHelpOpen(true); }}>
                      <HelpCircle className="w-4 h-4 mr-2" aria-hidden="true" /> Central de Ajuda
                    </button>
                    <div className="border-t dark:border-gray-700" />
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-14 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                      role="menuitem"
                      aria-label="Sair"
                    >
                      <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Sair
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-400"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" aria-hidden="true" />
                ) : (
                  <Menu className="w-6 h-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t dark:border-gray-700"
          >
            <div className="px-4 py-3 space-y-3" role="menu">
              <button
                onClick={() => {
                  handleGoHome();
                }}
                className="flex items-center w-full px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                role="menuitem"
                aria-label="Inicio"
              >
                <HomeIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                Inicio
              </button>
              <button
                onClick={() => { handleExportPdf(); setIsMobileMenuOpen(false); }}
                className="flex items-center w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                role="menuitem"
                aria-label="Exportar PDF"
              >
                <FileDown className="w-5 h-5 mr-2" aria-hidden="true" />
                Exportar PDF
              </button>
              <button
                onClick={() => goToDashboardSection("insights")}
                className="flex items-center w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                role="menuitem"
                aria-label="Insights"
              >
                <Lightbulb className="w-5 h-5 mr-2" aria-hidden="true" />
                Insights
              </button>
              <button
                onClick={() => { navigate('/explore'); setIsMobileMenuOpen(false); }}
                className="flex items-center w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                role="menuitem"
                aria-label="Explorar"
              >
                <BarChart3 className="w-5 h-5 mr-2" aria-hidden="true" />
                Explorar dados
              </button>
              <button
                onClick={() => goToDashboardSection("channels")}
                className="flex items-center w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                role="menuitem"
                aria-label="Copiar link"
              >
                <BarChart3 className="w-5 h-5 mr-2" aria-hidden="true" />
                Performance por Canal
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                role="menuitem"
                aria-label={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5 mr-2" aria-hidden="true" />
                ) : (
                  <Moon className="w-5 h-5 mr-2" aria-hidden="true" />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <div className="pt-3 border-t dark:border-gray-700">
                <div className="text-16 mb-2">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {user?.name}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  role="menuitem"
                  aria-label="Logout from your account"
                >
                  <LogOut className="w-5 h-5 mr-2" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      {/* Modals */}
      {isHelpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Central de Ajuda"
          className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50 p-4 md:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHelpOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-20 font-semibold text-gray-900 dark:text-white">Central de Ajuda</h3>
                <p className="text-14 text-gray-600 dark:text-gray-300">Fale com nosso suporte ou acesse materiais uteis.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary-600" />
                  <div>
                    <div className="text-14 text-gray-500 dark:text-gray-400">E-mail</div>
                    <div className="text-16 font-medium text-gray-900 dark:text-white" id="supportEmail">suporte@restaurant-intelligence.com</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary" onClick={() => window.open('mailto:suporte@restaurant-intelligence.com', '_blank')} aria-label="Enviar e-mail">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button className="btn-secondary" onClick={() => { const t = 'suporte@restaurant-intelligence.com'; navigator.clipboard?.writeText(t); }} aria-label="Copiar e-mail">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary-600" />
                  <div>
                    <div className="text-14 text-gray-500 dark:text-gray-400">WhatsApp</div>
                    <div className="text-16 font-medium text-gray-900 dark:text-white" id="supportWhats">+55 41 90000-0000</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary" onClick={() => window.open('https://wa.me/5541900000000', '_blank')} aria-label="Abrir WhatsApp">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button className="btn-secondary" onClick={() => { const t = '+55 41 90000-0000'; navigator.clipboard?.writeText(t); }} aria-label="Copiar telefone">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg border dark:border-gray-700">
                <div className="text-14 text-gray-500 dark:text-gray-400">Dicas rapidas</div>
                <ul className="list-disc ml-5 text-14 text-gray-700 dark:text-gray-300">
                  <li>Use a barra de filtros para refinar periodo, canal e loja.</li>
                  <li>Exporte os dados em CSV para analises externas.</li>
                  <li>Ative o modo escuro pelo icone de tema no topo.</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button className="btn-secondary" onClick={() => setIsHelpOpen(false)} aria-label="Fechar ajuda">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFavorites && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50 p-4 md:p-6 overflow-y-auto"
          onClick={() => setShowFavorites(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-20 font-semibold mb-3 text-gray-900 dark:text-white">Favoritos de Filtros</h3>
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="fav-name">Nome do favorito</label>
                <input id="fav-name" value={favName} onChange={(e) => setFavName(e.target.value)} className="input" placeholder="Ex.: Maio - iFood - Loja SP" />
                <button className="btn-primary mt-2" onClick={saveFavorite}>Salvar filtros atuais</button>
              </div>
              <div>
                <h4 className="text-16 font-semibold text-gray-900 dark:text-white mb-2">Salvos</h4>
                {favorites.length === 0 && (
                  <p className="text-14 text-gray-600 dark:text-gray-400">Nenhum favorito ainda.</p>
                )}
                <ul className="space-y-2">
                  {favorites.map((f) => (
                    <li key={f.name} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded">
                      <span className="text-14 text-gray-800 dark:text-gray-200">{f.name}</span>
                      <div className="space-x-2">
                        <button className="btn-secondary" onClick={() => applyFavorite(f)}>Aplicar</button>
                        <button className="btn-secondary" onClick={() => deleteFavorite(f.name)}>Excluir</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button className="btn-secondary" onClick={() => setShowFavorites(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {children}
      </main>
    </div>
  );
};





















