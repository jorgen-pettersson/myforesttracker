import React, { createContext, useContext, ReactNode } from "react";
import { en, TranslationKeys } from "./en";
import { sv } from "./sv";
import { useLanguage, Language } from "../features/preferences";

type Translations = Record<TranslationKeys, string>;

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = {
  en,
  sv,
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
);

interface LocalizationProviderProps {
  children: ReactNode;
}

export function LocalizationProvider({ children }: LocalizationProviderProps) {
  const { language, setLanguage } = useLanguage("en");

  const t = (
    key: TranslationKeys,
    params?: Record<string, string | number>
  ): string => {
    let text = translations[language][key] || translations.en[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  };

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      "useLocalization must be used within a LocalizationProvider"
    );
  }
  return context;
}

export type { Language, TranslationKeys };
