'use client';

import { useSyncExternalStore } from 'react';
import { createStorageStore } from '@/hooks/storage-store';

const STORAGE_KEY = 'tms:shortcuts';
const store = createStorageStore();
// Storage throws when blocked; the choice then lasts for the session only.
let unsaved = true;

export function shortcutsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return unsaved;
  }
}

export function setShortcutsEnabled(enabled: boolean) {
  unsaved = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {}
  store.notify();
}

// Single-key shortcuts can be turned off (WCAG 2.1.4); ⌘K is not one of them.
export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(store.subscribe, shortcutsEnabled, () => true);
}
