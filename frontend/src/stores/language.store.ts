import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/config';

interface LanguageState {
  language: string;
  setLanguage: (language: string) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, _get) => ({
      language: 'fr', // Default to French

      setLanguage: (language) => {
        set({ language });
        // Also update i18next
        i18n.changeLanguage(language);
      },
    }),
    {
      name: 'language-storage', // Key for localStorage
    }
  )
);

// Initialize i18n with the persisted language on app startup
const initializeLanguage = () => {
  const persistedLanguage = useLanguageStore.getState().language;
  if (persistedLanguage && persistedLanguage !== i18n.language) {
    i18n.changeLanguage(persistedLanguage);
  }
};

// Call initialization
initializeLanguage();
