import React, { createContext, useContext, useMemo, useState } from "react";

export type Currency = "BRL" | "USD" | "EUR";
export type DateFormat = "dd/MM/yyyy" | "yyyy-MM-dd";

interface PreferencesContextType {
  currency: Currency;
  dateFormat: DateFormat;
  setCurrency: (c: Currency) => void;
  setDateFormat: (f: DateFormat) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const ALLOWED_CURRENCIES: Currency[] = ["BRL", "USD", "EUR"];
const ALLOWED_DATE_FORMATS: DateFormat[] = ["dd/MM/yyyy", "yyyy-MM-dd"];

const isCurrency = (value: string | null): value is Currency =>
  !!value && ALLOWED_CURRENCIES.includes(value as Currency);

const isDateFormat = (value: string | null): value is DateFormat =>
  !!value && ALLOWED_DATE_FORMATS.includes(value as DateFormat);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem("ri:currency");
    if (isCurrency(saved)) return saved;
    localStorage.setItem("ri:currency", "BRL");
    return "BRL";
  });

  const [dateFormat, setDateFormatState] = useState<DateFormat>(() => {
    const saved = localStorage.getItem("ri:dateFormat");
    if (isDateFormat(saved)) return saved;
    localStorage.setItem("ri:dateFormat", "dd/MM/yyyy");
    return "dd/MM/yyyy";
  });

  const setCurrency = (c: Currency) => {
    const next = isCurrency(c) ? c : "BRL";
    setCurrencyState(next);
    localStorage.setItem("ri:currency", next);
    window.dispatchEvent(new CustomEvent("ri:prefs-changed"));
  };

  const setDateFormat = (f: DateFormat) => {
    const next = isDateFormat(f) ? f : "dd/MM/yyyy";
    setDateFormatState(next);
    localStorage.setItem("ri:dateFormat", next);
    window.dispatchEvent(new CustomEvent("ri:prefs-changed"));
  };

  const value = useMemo(
    () => ({ currency, dateFormat, setCurrency, setDateFormat }),
    [currency, dateFormat]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
};
