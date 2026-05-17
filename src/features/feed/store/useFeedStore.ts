import { create } from 'zustand';
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

export const useFeedStore = create<FeedStore>((set) => ({
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
}));
