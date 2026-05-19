import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Enums } from '@/types/database';

export type SortOrder = 'recent' | 'comments' | 'spice';
export type PostCategory = Enums<'post_category'>;

export interface FeedState {
  sort: SortOrder;
  minSpice: number;
  activeCategory: PostCategory | null;
}

export interface FeedActions {
  setSort(sort: SortOrder): void;
  setMinSpice(n: number): void;
  setCategory(cat: PostCategory | null): void;
}

type FeedStore = FeedState & FeedActions;

export const useFeedStore = create<FeedStore>()(
  persist(
    (set) => ({
      sort: 'recent',
      minSpice: 0,
      activeCategory: null,

      setSort(sort) {
        set({ sort });
      },
      setMinSpice(n) {
        set({ minSpice: n });
      },
      setCategory(cat) {
        set({ activeCategory: cat });
      },
    }),
    {
      name: 'akin.feedPrefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the preference fields, not the action methods.
      partialize: (s): FeedState => ({
        sort: s.sort,
        minSpice: s.minSpice,
        activeCategory: s.activeCategory,
      }),
    },
  ),
);
