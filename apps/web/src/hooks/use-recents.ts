'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { createStorageStore } from '@/hooks/storage-store';
import { useSession } from '@/hooks/use-session';
import { getSessionFromDocument } from '@/lib/session';

export interface Recent {
  href: string;
  code: string;
}

const MAX_RECENTS = 5;
const EMPTY: Recent[] = [];
const store = createStorageStore();
// Storage throws when blocked; the list then lasts for the session only.
const unsaved = new Map<string, Recent[]>();
// useSyncExternalStore needs the same array while the stored text is unchanged.
let parsed: { raw: string; recents: Recent[] } | undefined;

const keyFor = (userId: string) => `tms:recents:${userId}`;

// Storage is editable, so only same-origin links pass ("/\evil.com" is another host).
function isRecent(value: unknown): value is Recent {
  const { href, code } = (value ?? {}) as Partial<Recent>;
  if (typeof code !== 'string' || typeof href !== 'string') return false;
  try {
    return new URL(href, location.origin).origin === location.origin;
  } catch {
    return false;
  }
}

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
  store.notify();
}

export function useRecents(): Recent[] {
  const userId = useSession()?.userId;
  return useSyncExternalStore(
    store.subscribe,
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
