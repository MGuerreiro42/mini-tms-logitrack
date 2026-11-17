'use client';

import { useSyncExternalStore } from 'react';
import { createStorageStore } from '@/hooks/storage-store';

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

const STORAGE_KEY = 'tms:density';
const store = createStorageStore();
// Storage throws when blocked; the choice then lasts for the session only.
let unsaved: Density = 'comfortable';

function read(): Density {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'compact'
      ? 'compact'
      : 'comfortable';
  } catch {
    return unsaved;
  }
}

export function setDensity(density: Density) {
  unsaved = density;
  try {
    localStorage.setItem(STORAGE_KEY, density);
  } catch {}
  store.notify();
}

export function useDensity(): Density {
  return useSyncExternalStore(store.subscribe, read, () => 'comfortable');
}
