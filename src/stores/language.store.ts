import { create } from "zustand";

export type AppLanguage = "en" | "th";

interface LanguageState {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
}

const LANGUAGE_STORAGE_KEY = "app-language";

const detectInitialLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === "en" || saved === "th") return saved;

  const locale = window.navigator.language.toLowerCase();
  return locale.startsWith("th") ? "th" : "en";
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: detectInitialLanguage(),
  setLanguage: (language) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
    set({ language });
  },
  toggleLanguage: () => {
    const next = get().language === "en" ? "th" : "en";
    get().setLanguage(next);
  },
}));
