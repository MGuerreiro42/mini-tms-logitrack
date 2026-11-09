'use client';

import { XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useEffectEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { Peek } from '@/hooks/use-peek';
import { isTyping } from '@/lib/is-typing';

const DESKTOP_QUERY = '(min-width: 768px)';

interface PeekSheetProps {
  peek: Peek;
  label: string;
  // The full page of the peeked row.
  href: string;
  children: ReactNode;
}

// Non-modal on purpose (decision 10.2): no scrim and no focus trap, the table stays usable.
export function PeekSheet({ peek, label, href, children }: PeekSheetProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const sheetRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isDesktop) closeRef.current?.focus();
  }, [isDesktop]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    if (event.altKey) return;
    if (event.key === 'Escape') return peek.close();
    const target = event.target as Element;
    if (isTyping(target)) return;
    if (event.key === 'j' || event.key === 'J') return peek.next();
    if (event.key === 'k' || event.key === 'K') return peek.prev();
    // Enter on the sheet itself or its close button opens the page; other controls keep theirs.
    if (
      event.key === 'Enter' &&
      (target === sheetRef.current || target === closeRef.current)
    ) {
      event.preventDefault();
      router.push(href);
    }
  });
  useEffect(() => {
    if (!isDesktop) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDesktop]);

  if (!isDesktop) return null;

  return (
    <aside
      ref={sheetRef}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      tabIndex={-1}
      className="fixed top-20 right-6 bottom-6 z-30 flex w-110 flex-col overflow-hidden rounded-xl bg-card shadow-panel outline-none"
    >
      <div className="flex items-center justify-between gap-3 border-b px-5 py-2.5">
        <p className="text-xs text-muted-foreground">
          <kbd className="font-mono">J</kbd> /{' '}
          <kbd className="font-mono">K</kbd> move ·{' '}
          <kbd className="font-mono">Enter</kbd> open ·{' '}
          <kbd className="font-mono">Esc</kbd> close
        </p>
        <Button
          ref={closeRef}
          variant="ghost"
          size="icon-sm"
          aria-label="Close preview"
          onClick={peek.close}
        >
          <XIcon aria-hidden />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </aside>
  );
}
