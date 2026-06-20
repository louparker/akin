import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LocalePreference = 'sv' | 'en' | 'system';

export interface LocaleState {
  preference: LocalePreference;
}

export interface LocaleActions {
  setPreference(preference: LocalePreference): void;
}

type LocaleStore = LocaleState & LocaleActions;

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      preference: 'system',

      setPreference(preference) {
        set({ preference });
      },
    }),
    {
      name: 'akin.locale.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): LocaleState => ({ preference: s.preference }),
    },
  ),
);
