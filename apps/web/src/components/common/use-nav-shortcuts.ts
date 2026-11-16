'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef } from 'react';
import { type NavSection, navLinks } from '@/components/common/nav-tree';
import { shortcutsEnabled } from '@/hooks/use-shortcuts-enabled';
import { isTyping } from '@/lib/is-typing';

const SEQUENCE_MS = 1000;

export const keyShortcut = (key: string) => `G ${key.toUpperCase()}`;

// g then a link's key opens it; [ toggles the sidebar.
export function useNavShortcuts(nav: NavSection[], toggle: () => void) {
  const router = useRouter();
  const gAt = useRef(0);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      isTyping(event.target as Element | null) ||
      document.querySelector('[role="dialog"]') ||
      !shortcutsEnabled()
    ) {
      return;
    }
    const key = event.key.toLowerCase();
    const inSequence = Date.now() - gAt.current <= SEQUENCE_MS;
    gAt.current = 0;

    if (event.key === '[') {
      event.preventDefault();
      toggle();
    } else if (inSequence) {
      const link = navLinks(nav).find((item) => item.shortcut === key);
      if (!link) return;
      event.preventDefault();
      router.push(link.href);
    } else if (key === 'g') {
      gAt.current = Date.now();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
