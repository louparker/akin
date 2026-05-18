import { registerStore, resetAllStores } from '../store-utils';

describe('store-utils', () => {
  it('calls reset on every registered store', () => {
    const storeA = { reset: jest.fn() };
    const storeB = { reset: jest.fn() };

    registerStore(storeA);
    registerStore(storeB);

    resetAllStores();

    expect(storeA.reset).toHaveBeenCalledTimes(1);
    expect(storeB.reset).toHaveBeenCalledTimes(1);
  });
});
