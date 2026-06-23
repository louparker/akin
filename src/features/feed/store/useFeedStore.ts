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
  // Transient (never persisted): the id of a just-created post so the feed can
  // animate it in once. Cleared after the entrance animation has played.
  highlightPostId: string | null;
}

export interface FeedActions {
  setSort(sort: SortOrder): void;
  setMinSpice(n: number): void;
  setCategory(cat: PostCategory | null): void;
  setHighlightPostId(id: string | null): void;
}

type FeedStore = FeedState & FeedActions;

export const useFeedStore = create<FeedStore>()(
  persist(
    (set) => ({
      sort: 'recent',
      minSpice: 0,
      activeCategory: null,
      highlightPostId: null,

      setSort(sort) {
        set({ sort });
      },
      setMinSpice(n) {
        set({ minSpice: n });
      },
      setCategory(cat) {
        set({ activeCategory: cat });
      },
      setHighlightPostId(id) {
        set({ highlightPostId: id });
      },
    }),
    {
      name: 'akin.feedPrefs.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the preference fields — not the actions or the transient
      // highlightPostId (which must reset on every app launch).
      partialize: (s): Pick<FeedState, 'sort' | 'minSpice' | 'activeCategory'> => ({
        sort: s.sort,
        minSpice: s.minSpice,
        activeCategory: s.activeCategory,
      }),
    },
  ),
);
