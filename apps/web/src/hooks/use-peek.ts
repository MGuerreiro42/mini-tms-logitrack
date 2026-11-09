'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PEEK_PARAM = 'peek';

export interface Peek {
  peekId: string | undefined;
  open: (id: string) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
}

// keys: the row keys of the current page, in order, for J/K.
export function usePeek(keys: string[]): Peek {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const peekId = searchParams.get(PEEK_PARAM) ?? undefined;

  // Opening pushes so Back closes the peek; moving and closing replace.
  function go(id: string | undefined, mode: 'push' | 'replace') {
    const next = new URLSearchParams(searchParams.toString());
    if (id) next.set(PEEK_PARAM, id);
    else next.delete(PEEK_PARAM);
    const search = next.toString();
    router[mode](search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  // Paging is not crossed: J on the last row of the page does nothing.
  function step(delta: number) {
    const index = peekId ? keys.indexOf(peekId) : -1;
    const id = index >= 0 ? keys[index + delta] : undefined;
    if (id) go(id, 'replace');
  }

  return {
    peekId,
    open: (id) => go(id, peekId ? 'replace' : 'push'),
    close: () => {
      go(undefined, 'replace');
      if (!peekId) return;
      document
        .querySelector<HTMLElement>(`[data-row-key="${CSS.escape(peekId)}"] a`)
        ?.focus();
    },
    next: () => step(1),
    prev: () => step(-1),
  };
}
