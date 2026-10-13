import { useMemo, useSyncExternalStore } from 'react';
import { vi } from 'vitest';

const ORIGIN = 'http://localhost';

let url = new URL('/', ORIGIN);
const listeners = new Set<() => void>();

function navigate(href: string) {
  url = new URL(href, url);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const router = {
  push: vi.fn(navigate),
  replace: vi.fn(navigate),
  refresh: vi.fn(),
};

export function resetNavigation(href = '/') {
  url = new URL(href, ORIGIN);
  vi.mocked(router.push).mockClear();
  vi.mocked(router.replace).mockClear();
  vi.mocked(router.refresh).mockClear();
}

export function currentUrl(): string {
  return `${url.pathname}${url.search}`;
}

export function useRouter() {
  return router;
}

export function usePathname() {
  return useSyncExternalStore(subscribe, () => url.pathname);
}

export function useSearchParams() {
  const search = useSyncExternalStore(subscribe, () => url.search);
  return useMemo(() => new URLSearchParams(search), [search]);
}
