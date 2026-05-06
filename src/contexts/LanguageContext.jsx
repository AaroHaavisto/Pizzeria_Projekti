import {createContext, useContext, useEffect, useState} from 'react';

const LanguageContext = createContext();

/**
 * Provides language state management for the application.
 * Supports Finnish (fi) and English (en).
 * @param {React.ReactNode} children - Child components
 */
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') {
      return 'fi';
    }

    const savedLanguage = window.localStorage.getItem('appLanguage');
    return savedLanguage === 'en' ? 'en' : 'fi';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('appLanguage', language);
    }
  }, [language]);

  const changeLanguage = nextLanguage => {
    setLanguage(nextLanguage === 'en' ? 'en' : 'fi');
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 * @returns {Object} Language context with language and changeLanguage function
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
