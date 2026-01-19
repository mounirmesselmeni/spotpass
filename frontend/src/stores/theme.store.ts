import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  colorScheme: 'light' | 'dark';
  toggleColorScheme: () => void;
  setColorScheme: (scheme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorScheme: 'light',

      toggleColorScheme: () =>
        set((state) => ({
          colorScheme: state.colorScheme === 'dark' ? 'light' : 'dark',
        })),

      setColorScheme: (scheme) => set({ colorScheme: scheme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
