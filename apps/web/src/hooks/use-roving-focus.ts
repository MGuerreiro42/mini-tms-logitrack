'use client';

import {
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
  useLayoutEffect,
  useRef,
} from 'react';

const STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

// One tab stop for a set of items (the APG roving tabindex): arrows, Home and End move between
// them. Items are found by selector, so they can sit in any markup; spread the result on the container.
export function useRovingFocus(
  ref: RefObject<HTMLElement | null>,
  itemSelector: string,
) {
  const current = useRef<Element | null>(null);
  const items = () =>
    Array.from(ref.current?.querySelectorAll<HTMLElement>(itemSelector) ?? []);

  // Every render: items come and go, and the remembered one may be gone.
  useLayoutEffect(() => {
    const all = items();
    const stop = all.find((item) => item === current.current) ?? all[0];
    for (const item of all) item.tabIndex = item === stop ? 0 : -1;
  });

  return {
    onFocus: ({ target }: FocusEvent) => {
      const all = items();
      const item = all.find((candidate) => candidate === target);
      if (!item) return;
      current.current = item;
      for (const other of all) other.tabIndex = other === item ? 0 : -1;
    },
    onKeyDown: (event: KeyboardEvent) => {
      const all = items();
      const index = all.indexOf(event.target as HTMLElement);
      if (index < 0) return;
      const target =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? all.length - 1
            : index + (STEP[event.key] ?? 0);
      if (target === index || !all[target]) return;
      event.preventDefault();
      all[target].focus();
    },
  };
}
