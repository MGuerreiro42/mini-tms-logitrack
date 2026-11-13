'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { useSession } from '@/hooks/use-session';
import { getSessionFromDocument } from '@/lib/session';

export interface Recent {
  href: string;
  code: string;
}

const MAX_RECENTS = 5;
const EMPTY: Recent[] = [];
const listeners = new Set<() => void>();
// Storage throws when blocked; the list then lasts for the session only.
const unsaved = new Map<string, Recent[]>();
// useSyncExternalStore needs the same array while the stored text is unchanged.
let parsed: { raw: string; recents: Recent[] } | undefined;

const keyFor = (userId: string) => `tms:recents:${userId}`;

const isRecent = (value: unknown): value is Recent =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Recent).code === 'string' &&
  typeof (value as Recent).href === 'string' &&
  (value as Recent).href.startsWith('/') &&
  !(value as Recent).href.startsWith('//');

function read(key: string): Recent[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return unsaved.get(key) ?? EMPTY;
  }
  if (raw === null) return EMPTY;
  if (parsed?.raw !== raw) {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {}
    parsed = {
      raw,
      recents: Array.isArray(value) ? value.filter(isRecent) : EMPTY,
    };
  }
  return parsed.recents;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function rememberRecent(entry: Recent) {
  const userId = getSessionFromDocument()?.userId;
  if (!userId) return;
  const key = keyFor(userId);
  const recents = [
    entry,
    ...read(key).filter((recent) => recent.href !== entry.href),
  ].slice(0, MAX_RECENTS);
  unsaved.set(key, recents);
  try {
    localStorage.setItem(key, JSON.stringify(recents));
  } catch {}
  for (const listener of listeners) listener();
}

export function useRecents(): Recent[] {
  const userId = useSession()?.userId;
  return useSyncExternalStore(
    subscribe,
    () => (userId ? read(keyFor(userId)) : EMPTY),
    () => EMPTY,
  );
}

// Records the current page once its shipment has loaded (code is undefined until then).
export function useRememberRecent(code: string | undefined) {
  const pathname = usePathname();
  useEffect(() => {
    if (code) rememberRecent({ href: pathname, code });
  }, [pathname, code]);
}
