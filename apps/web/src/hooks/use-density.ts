'use client';

import { useSyncExternalStore } from 'react';

export const DENSITIES = ['comfortable', 'compact'] as const;
export type Density = (typeof DENSITIES)[number];

const STORAGE_KEY = 'tms:density';
const listeners = new Set<() => void>();

function read(): Density {
  return localStorage.getItem(STORAGE_KEY) === 'compact'
    ? 'compact'
    : 'comfortable';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function setDensity(density: Density) {
  localStorage.setItem(STORAGE_KEY, density);
  for (const listener of listeners) listener();
}

export function useDensity(): Density {
  return useSyncExternalStore(subscribe, read, () => 'comfortable');
}
