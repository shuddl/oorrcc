import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setFontFamily: (font: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      primaryColor: 'indigo',
      secondaryColor: 'gray',
      fontFamily: 'sans',
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setSecondaryColor: (color) => set({ secondaryColor: color }),
      setFontFamily: (font) => set({ fontFamily: font })
    }),
    {
      name: 'theme-storage'
    }
  )
);