import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

/**
 * Provides language state management for the application.
 * Supports Finnish (fi) and English (en).
 * @param {React.ReactNode} children - Child components
 */
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('fi');

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('appLanguage') || 'fi';
    setLanguage(savedLanguage);
  }, []);

  // Save language preference to localStorage when it changes
  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('appLanguage', lang);
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
