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

  useEffect(() => {
    if (isDesktop) sheetRef.current?.focus();
  }, [isDesktop]);

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    if (event.altKey) return;
    const target = event.target as Element;
    const typing = isTyping(target);
    // Esc in a field outside the sheet belongs to that field (e.g. clearing a search).
    if (event.key === 'Escape') {
      if (!typing || sheetRef.current?.contains(target)) peek.close();
      return;
    }
    if (typing) return;
    if (event.key === 'j' || event.key === 'J') return peek.next();
    if (event.key === 'k' || event.key === 'K') return peek.prev();
    // Enter opens the page only from the sheet itself; its buttons and links keep their own.
    if (event.key === 'Enter' && target === sheetRef.current) {
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
      className="fixed top-20 right-6 bottom-6 z-30 flex w-110 flex-col overflow-hidden rounded-xl bg-card shadow-panel outline-ring focus-visible:outline-2"
    >
      <div className="flex items-center justify-between gap-3 border-b px-5 py-2.5">
        <p className="text-xs text-muted-foreground">
          <kbd className="font-mono">J</kbd> /{' '}
          <kbd className="font-mono">K</kbd> move ·{' '}
          <kbd className="font-mono">Enter</kbd> open ·{' '}
          <kbd className="font-mono">Esc</kbd> close
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close preview"
          onClick={peek.close}
        >
          <XIcon aria-hidden />
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </aside>
  );
}
