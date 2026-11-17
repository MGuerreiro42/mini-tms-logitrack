import { createStorageStore } from './storage-store';

describe('createStorageStore', () => {
  it('notifies subscribers on writes and other tabs until they unsubscribe', () => {
    const store = createStorageStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.notify();
    window.dispatchEvent(new StorageEvent('storage'));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.notify();
    window.dispatchEvent(new StorageEvent('storage'));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
