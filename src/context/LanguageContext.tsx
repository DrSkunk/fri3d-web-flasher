import { useState, createContext } from "react";
import { Language } from "../enum/Language";

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  switchLanguage: () => void;
}

export const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: Language.NL,
  setLanguage: () => {},
  switchLanguage: () => {},
});

export function LanguageContextProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(Language.NL);

  function setLanguage(language: Language) {
    setCurrentLanguage(language);
  }

  function switchLanguage() {
    setCurrentLanguage((currentLanguage) => (currentLanguage === Language.NL ? Language.EN : Language.NL));
  }

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        switchLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}
