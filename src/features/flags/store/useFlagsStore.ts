import { create } from 'zustand';
import { flagDefaults, type FlagKey } from '../defaults';

interface FlagsState {
  flags: Record<FlagKey, boolean>;
  setFlags: (flags: Record<FlagKey, boolean>) => void;
}

export const useFlagsStore = create<FlagsState>((set) => ({
  flags: { ...flagDefaults },
  setFlags: (flags) => set({ flags }),
}));
