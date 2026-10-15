'use client';

import { SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

export function CommandMenu({ items }: { items: NavItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const code = query.trim().toUpperCase();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) setQuery('');
  }

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
        className="size-11 px-0 font-normal text-muted-foreground lg:h-9 lg:w-64 lg:justify-start lg:px-3"
      >
        <SearchIcon aria-hidden />
        <span className="sr-only lg:not-sr-only">Search or jump to…</span>
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
        <Command>
          <CommandInput
            placeholder="Page name or tracking code"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              No matching page. Paste a full tracking code to open a shipment.
            </CommandEmpty>
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
