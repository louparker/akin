import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
}

interface ThemeActions {
  setPreference: (preference: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'akin.themePrefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): ThemeState => ({ preference: s.preference }),
    },
  ),
);
