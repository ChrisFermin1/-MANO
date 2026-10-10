'use client';

import { createContext, useContext, useState, useEffect } from 'react';
const enRaw = require('../locales/en.json');
const esRaw = require('../locales/es.json');
const en = enRaw.default || enRaw;
const es = esRaw.default || esRaw;

type Language = 'en' | 'es';
const translations = { en, es };

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, params?: Record<string, string | number>) => string;
}>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => {
    return en[key as keyof typeof en] || key;
  },
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('mano_language') as Language;
    if (savedLang === 'es' || savedLang === 'en') setLanguageState(savedLang);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mano_language', lang);
  };

  const t = (key: keyof typeof en, params?: Record<string, string | number>): string => {
    let str = translations[language][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: t as any }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
