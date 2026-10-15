'use client';

import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useState } from 'react';
import type { NavItem } from '@/components/common/nav-list';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { isTrackingCode, publicTrackingPath } from '@/lib/public-tracking-path';

function isShortcut(event: KeyboardEvent): boolean {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return (
    event.key.toLowerCase() === 'k' && (isMac ? event.metaKey : event.ctrlKey)
  );
}

export function CommandMenu({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const code = query.trim().toUpperCase();

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setQuery('');
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || !isShortcut(event)) return;
    if (!open && document.querySelector('[role="dialog"]')) return;
    event.preventDefault();
    changeOpen(!open);
  });

  useEffect(() => {
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  function go(href: string) {
    changeOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Meta+K Control+K"
        className="size-11 px-0 font-normal text-muted-foreground lg:h-9 lg:w-48 lg:justify-start lg:px-3 xl:w-64"
      >
        <SearchIcon aria-hidden />
        <span className="sr-only lg:not-sr-only lg:truncate">
          Search or jump to…
        </span>
        <kbd className="ml-auto hidden rounded-xs bg-muted px-1.5 font-mono text-xs lg:inline">
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={changeOpen}
        title="Search or jump to"
        description="Go to a page, or open a shipment by its tracking code."
      >
        <Command vimBindings={false}>
          <CommandInput
            placeholder="Page name or tracking code"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!isTrackingCode(code) && (
              <CommandEmpty>
                No matching page. Paste a full tracking code to open a shipment.
              </CommandEmpty>
            )}
            {isTrackingCode(code) && (
              <CommandGroup heading="Shipment" forceMount>
                <CommandItem
                  forceMount
                  value={code}
                  onSelect={() => go(publicTrackingPath(code))}
                  className="min-h-11"
                >
                  Track <span className="font-mono">{code}</span>
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading="Go to">
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.name}
                  onSelect={() => go(item.href)}
                  className="min-h-11"
                >
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
