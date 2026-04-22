import React, { createContext, useContext, useState, useCallback } from "react";
import { Language, t, TranslationKey } from "./translations";

type InlineTranslations = Partial<Record<Language, string>> & { de: string; en: string };

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  /** Inline translation helper: tt({ de: "Hallo", en: "Hello", tr: "Merhaba", ar: "مرحبا", ru: "Привет" }) */
  tt: (translations: InlineTranslations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LOCALE_MAP: Record<Language, string> = {
  de: "de-DE", en: "en-US", tr: "tr-TR", ar: "ar-SA", ru: "ru-RU",
};

export const getLocale = (lang: Language) => LOCALE_MAP[lang] || "en-US";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    const valid: Language[] = ["de", "en", "tr", "ar", "ru"];
    return valid.includes(saved as Language) ? (saved as Language) : "de";
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("app-language", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  }, []);

  const translate = useCallback((key: TranslationKey) => t(key, lang), [lang]);

  const tt = useCallback((translations: InlineTranslations): string => {
    return translations[lang] || translations.en || translations.de;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate, tt }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
