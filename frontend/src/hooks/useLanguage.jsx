import { createContext, useContext, useState, useEffect } from "react";
import en from "../i18n/en.json";
import hi from "../i18n/hi.json";

const LanguageContext = createContext();

// Translation data
const translations = {
  en: en,
  hi: hi,
};

// Language Provider Component
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Get from localStorage or browser default
    const saved = localStorage.getItem("app_language");
    if (saved) return saved;

    const browserLang = navigator.language.split("-")[0];
    return translations[browserLang] ? browserLang : "en";
  });

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  const { language } = context;

  // Get translation function
  const t = (key) => {
    const parts = key.split(".");
    let current = translations[language];

    for (const part of parts) {
      if (current && typeof current === "object") {
        current = current[part];
      } else {
        // Fallback to English if translation missing
        current = translations["en"];
        for (const p of parts) {
          current = current[p];
        }
        break;
      }
    }

    return typeof current === "string" ? current : key;
  };

  return {
    language,
    setLanguage: context.setLanguage,
    t,
    // Common translations object for quick access
    translations: translations[language],
  };
}

// Available languages
export const AVAILABLE_LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "hi", name: "हिंदी", flag: "🇮🇳" },
];
