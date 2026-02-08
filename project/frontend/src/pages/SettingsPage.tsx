import React, { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { usePreferences, Currency, DateFormat } from "@/contexts/PreferencesContext";
import { apiClient } from "@/api/client";

export const SettingsPage: React.FC = () => {
  const { user, logout, updateName } = useAuthStore();
  const prefs = usePreferences();

  const [currency, setCurrency] = useState<Currency>(prefs.currency);
  const [dateFormat, setDateFormat] = useState<DateFormat>(prefs.dateFormat);
  const [saving, setSaving] = useState(false);

  const handleSavePrefs = () => {
    setSaving(true);
    try {
      prefs.setCurrency(currency);
      prefs.setDateFormat(dateFormat);
      alert("Preferências salvas");
    } finally {
      setSaving(false);
    }
  };

  const handleClearFavorites = () => {
    localStorage.removeItem("ri:filterFavorites");
    alert("Favoritos removidos");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-32 font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas preferências de conta e da aplicação.</p>
        </div>
      </header>

      <section className="card" aria-label="Perfil">
        <h2 className="text-20 font-semibold mb-4 text-gray-900 dark:text-white">Perfil</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome</label>
            <input
              className="input"
              defaultValue={user?.name || ""}
              onBlur={async (e) => {
                const v = e.target.value.trim();
                if (v && v !== user?.name) {
                  await updateName(v);
                  alert('Nome atualizado');
                }
              }}
            />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input className="input" value={user?.email || ""} readOnly />
          </div>
        </div>
      </section>

      <section className="card" aria-label="Preferências">
        <h2 className="text-20 font-semibold mb-4 text-gray-900 dark:text-white">Preferências</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Moeda</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              <option value="BRL">BRL — Real</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div>
            <label className="label">Formato de data</label>
            <select className="input" value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormat)}>
              <option value="dd/MM/yyyy">dd/MM/yyyy</option>
              <option value="yyyy-MM-dd">yyyy-MM-dd</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button className="btn-primary" onClick={handleSavePrefs} disabled={saving} aria-busy={saving}>Salvar preferências</button>
          <button className="btn-secondary" onClick={handleClearFavorites}>Limpar favoritos</button>
        </div>
      </section>

      <section className="card" aria-label="Sessão e segurança">
        <h2 className="text-20 font-semibold mb-4 text-gray-900 dark:text-white">Sessão</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Alterar senha</label>
            <PasswordChanger />
          </div>
          <div className="flex items-end justify-end">
            <button className="btn-secondary" onClick={logout} aria-label="Sair">Sair</button>
          </div>
        </div>
      </section>
    </div>
  );
};

const PasswordChanger: React.FC = () => {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword) {
      alert("Preencha as senhas");
      return;
    }
    if (newPassword.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirm) {
      alert("Confirmação de senha não confere");
      return;
    }
    setBusy(true);
    try {
      await apiClient.changePassword(currentPassword, newPassword);
      alert("Senha alterada com sucesso");
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (e: any) {
      // c8 ignore next
      alert(e?.message || "Falha ao alterar senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <input type="password" className="input" placeholder="Senha atual" value={currentPassword} onChange={(e)=>setCurrent(e.target.value)} />
      <input type="password" className="input" placeholder="Nova senha" value={newPassword} onChange={(e)=>setNewPass(e.target.value)} />
      <input type="password" className="input" placeholder="Confirmar nova senha" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
      <button className="btn-primary mt-4" onClick={handleChange} disabled={busy} aria-busy={busy}>Alterar senha</button>
    </div>
  );
};
