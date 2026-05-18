// Kill-switch flag keys. Adding a new flag requires:
// 1. Adding the key here (and to the DB via migration).
// 2. Defaulting to true — the app keeps working during an outage.
export type FlagKey = 'signups_open' | 'posting_open';

export const flagDefaults: Record<FlagKey, boolean> = {
  signups_open: true,
  posting_open: true,
};

export function isFlagKey(key: string): key is FlagKey {
  return Object.prototype.hasOwnProperty.call(flagDefaults, key);
}
