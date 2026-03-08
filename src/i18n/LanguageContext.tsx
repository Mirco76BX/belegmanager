import React, { createContext, useContext, useState, useCallback } from "react";
import { Language, t, TranslationKey } from "./translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    const valid: Language[] = ["de", "en", "tr", "ar", "ru"];
    return valid.includes(saved as Language) ? (saved as Language) : "de";
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app-language", newLang);
  }, []);

  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
