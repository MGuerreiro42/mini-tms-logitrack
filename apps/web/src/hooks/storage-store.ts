'use client';

// Listeners for a value kept in localStorage: notified on our own writes and on other tabs' (storage event).
export function createStorageStore() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      window.addEventListener('storage', listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
      };
    },
    notify() {
      for (const listener of listeners) listener();
    },
  };
}
