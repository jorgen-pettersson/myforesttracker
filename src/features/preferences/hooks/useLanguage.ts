import { useEffect, useState } from "react";
import { Language } from "../types/language";
import { loadLanguage, saveLanguage } from "../storage/languageStorage";

export function useLanguage(defaultLanguage: Language = "en") {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const load = async () => {
      const saved = await loadLanguage();
      if (saved) {
        setLanguageState(saved);
      }
    };
    load();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await saveLanguage(lang);
  };

  return {
    language,
    setLanguage,
  };
}
