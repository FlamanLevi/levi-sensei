import React, { createContext, useContext, useState } from 'react';

export type AppLanguage = 'en' | 'ja';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  t: {
    (en: string, ja: string): string;
    <T extends React.ReactNode, U extends React.ReactNode>(en: T, ja: U): T | U;
  };
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('levi_sensei_lang');
      if (saved === 'en' || saved === 'ja') return saved;
    } catch {
      // Ignore
    }
    return 'ja';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('levi_sensei_lang', lang);
    } catch {
      // Ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ja' ? 'en' : 'ja');
  };

  function t(en: string, ja: string): string;
  function t<T extends React.ReactNode, U extends React.ReactNode>(en: T, ja: U): T | U;
  function t(en: any, ja: any): any {
    return language === 'en' ? en : ja;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '', size = 'md' }) => {
  const { language, setLanguage } = useLanguage();

  const isSmall = size === 'sm';

  return (
    <div
      className={`inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner select-none ${className}`}
      title={language === 'en' ? 'Switch to Japanese (日本語)' : 'Switch to English (英語)'}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-black transition-all flex items-center gap-1 ${
          isSmall ? 'text-[10px]' : 'text-xs'
        } ${
          language === 'en'
            ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/30'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span>🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('ja')}
        className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl font-black transition-all flex items-center gap-1 ${
          isSmall ? 'text-[10px]' : 'text-xs'
        } ${
          language === 'ja'
            ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400/30'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <span>🇯🇵</span>
        <span>JA</span>
      </button>
    </div>
  );
};
