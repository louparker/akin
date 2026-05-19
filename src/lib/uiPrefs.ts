import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UiPrefsState {
  hasSeenCreateGuidelines: boolean;
  markCreateGuidelinesSeen(): void;
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set) => ({
      hasSeenCreateGuidelines: false,
      markCreateGuidelinesSeen() {
        set({ hasSeenCreateGuidelines: true });
      },
    }),
    {
      name: 'akin.uiPrefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ hasSeenCreateGuidelines: s.hasSeenCreateGuidelines }),
    },
  ),
);
