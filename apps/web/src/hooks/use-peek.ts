'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export const PEEK_PARAM = 'peek';

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
  // The URL lags behind a fast J J, so steps count from the last row asked for.
  const target = useRef(peekId);
  // Whether this hook pushed the peek's history entry, so closing can step back over it.
  const pushed = useRef(false);
  useEffect(() => {
    target.current = peekId;
  }, [peekId]);

  // Opening pushes so Back closes the peek; moving and closing replace.
  function go(id: string | undefined, mode: 'push' | 'replace') {
    const next = new URLSearchParams(searchParams.toString());
    target.current = id;
    if (id) next.set(PEEK_PARAM, id);
    else next.delete(PEEK_PARAM);
    const search = next.toString();
    router[mode](search ? `${pathname}?${search}` : pathname, {
      scroll: false,
    });
  }

  // Paging is not crossed: J on the last row of the page does nothing.
  function step(delta: number) {
    const index = target.current ? keys.indexOf(target.current) : -1;
    const id = index >= 0 ? keys[index + delta] : undefined;
    if (id) go(id, 'replace');
  }

  return {
    peekId,
    open: (id) => {
      if (!peekId) pushed.current = true;
      go(id, peekId ? 'replace' : 'push');
    },
    close: () => {
      if (pushed.current) {
        pushed.current = false;
        target.current = undefined;
        router.back();
      } else go(undefined, 'replace');
      if (!peekId) return;
      // The row may have left the page (a link, a live update): then the table's first link.
      const row = document.querySelector<HTMLElement>(
        `[data-row-key="${CSS.escape(peekId)}"] a`,
      );
      (row ?? document.querySelector<HTMLElement>('[data-row-key] a'))?.focus();
    },
    next: () => step(1),
    prev: () => step(-1),
  };
}
