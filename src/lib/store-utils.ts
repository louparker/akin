interface ResettableStore {
  reset(): void;
}

const _registry: ResettableStore[] = [];

export function registerStore(store: ResettableStore): void {
  _registry.push(store);
}

export function resetAllStores(): void {
  for (const store of _registry) {
    store.reset();
  }
}
