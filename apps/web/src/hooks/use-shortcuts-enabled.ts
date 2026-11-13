'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'tms:shortcuts';
const listeners = new Set<() => void>();
// Storage throws when blocked; the choice then lasts for the session only.
let unsaved = true;

export function shortcutsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return unsaved;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function setShortcutsEnabled(enabled: boolean) {
  unsaved = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {}
  for (const listener of listeners) listener();
}

// Single-key shortcuts can be turned off (WCAG 2.1.4); ⌘K is not one of them.
export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(subscribe, shortcutsEnabled, () => true);
}
