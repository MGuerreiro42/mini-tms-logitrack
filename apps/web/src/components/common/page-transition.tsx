'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef, ViewTransition } from 'react';

// After a link navigation focus moves to the new page heading; back/forward keeps the browser's own focus handling.
function useFocusHeadingOnNavigate(pathname: string) {
  const previous = useRef(pathname);
  const fromHistory = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      fromHistory.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    const heading = document.querySelector<HTMLElement>('main h1');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }, [pathname]);
}

// Keyed by path, so a page change crossfades while filters, tabs and pagination (search params) don't.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useFocusHeadingOnNavigate(pathname);

  return (
    <ViewTransition
      key={pathname}
      name="page"
      share="auto"
      enter="auto"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
