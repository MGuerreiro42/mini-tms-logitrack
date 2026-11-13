'use client';

import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { NavSection } from '@/components/common/nav-tree';
import { SidebarNav } from '@/components/common/sidebar';
import { SidebarContext } from '@/components/common/sidebar-context';
import { useMediaQuery } from '@/hooks/use-media-query';

export const SIDEBAR_COOKIE = 'tms-sidebar';
const YEAR_SECONDS = 60 * 60 * 24 * 365;

function saveRail(rail: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=rail; path=/; max-age=${rail ? YEAR_SECONDS : 0}; samesite=lax`;
}

// Docked from 1280 px (rail if the cookie says so); 1024-1279 px is a rail whose
// expanded form floats over main as an overlay, so the page never reflows.
export function SidebarFrame({
  nav,
  rail: initialRail,
  children,
}: {
  nav: NavSection[];
  rail: boolean;
  children: React.ReactNode;
}) {
  const [rail, setRail] = useState(initialRail);
  const [overlay, setOverlay] = useState(false);
  const wide = useMediaQuery('(min-width: 1280px)');
  const midRange = useMediaQuery('(min-width: 1024px) and (max-width: 1279px)');
  const panel = useRef<HTMLDivElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const compact = wide ? rail : !overlay;

  if (overlay && !midRange) setOverlay(false);

  function closeOverlay() {
    setOverlay(false);
    toggleButton.current?.focus();
  }

  function toggle() {
    if (wide) {
      setRail(!rail);
      saveRail(!rail);
    } else if (overlay) closeOverlay();
    else setOverlay(true);
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    // The overlay sits above the peek sheet, so it takes Esc first.
    event.stopPropagation();
    closeOverlay();
  });
  const onPointerDown = useEffectEvent((event: PointerEvent) => {
    if (!panel.current?.contains(event.target as Node)) closeOverlay();
  });

  useEffect(() => {
    if (!overlay) return;
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [overlay]);

  return (
    <SidebarContext value={{ compact, toggle }}>
      <div
        data-rail={rail}
        data-overlay={overlay}
        className="flex flex-1 flex-col duration-(--duration-base) ease-(--ease-standard) lg:grid lg:grid-cols-[4rem_minmax(0,1fr)] lg:transition-[grid-template-columns] xl:grid-cols-[15rem_minmax(0,1fr)] xl:data-[rail=true]:grid-cols-[4rem_minmax(0,1fr)]"
      >
        <div className="max-lg:hidden">
          <div
            ref={panel}
            // Any link inside closes the overlay, including one to the current page.
            onClickCapture={(event) => {
              if (overlay && (event.target as Element).closest('a')) {
                closeOverlay();
              }
            }}
            className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-4 overflow-x-hidden overflow-y-auto bg-nav p-3 shadow-[1px_0_0_var(--nav-line)] short:top-0 short:h-dvh max-xl:in-data-[overlay=true]:fixed max-xl:in-data-[overlay=true]:z-30 max-xl:in-data-[overlay=true]:w-60 max-xl:in-data-[overlay=true]:animate-sidebar-in max-xl:in-data-[overlay=true]:shadow-panel"
          >
            <SidebarNav nav={nav} />
            <button
              ref={toggleButton}
              type="button"
              aria-label="Sidebar"
              aria-expanded={!compact}
              aria-keyshortcuts="["
              onClick={toggle}
              className="mt-auto flex size-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&_svg]:size-4 [&_svg]:stroke-[1.75]"
            >
              <PanelLeftCloseIcon aria-hidden className="rail:hidden" />
              <PanelLeftOpenIcon aria-hidden className="hidden rail:block" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </SidebarContext>
  );
}
