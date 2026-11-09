'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SEARCH_DEBOUNCE_MS = 300;

const isTyping = (element: Element | null) =>
  element instanceof HTMLElement &&
  (element.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  // The URL moved on its own (back/forward, a removed chip): show what it holds.
  if (value !== shown) {
    setShown(value);
    setDraft(value);
  }

  const commit = useEffectEvent(onChange);
  useEffect(() => {
    const text = draft.trim();
    if (text === value) return;
    const timer = setTimeout(() => commit(text), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value]);

  const onSlash = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== '/' || event.defaultPrevented) return;
    if (isTyping(document.activeElement)) return;
    event.preventDefault();
    inputRef.current?.focus();
  });
  useEffect(() => {
    window.addEventListener('keydown', onSlash);
    return () => window.removeEventListener('keydown', onSlash);
  }, []);

  return (
    <div className="relative w-full md:w-72">
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={inputRef}
        type="search"
        aria-label="Search"
        aria-keyshortcuts="/"
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-10 pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Clear search"
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => {
            setDraft('');
            onChange('');
            inputRef.current?.focus();
          }}
        >
          <XIcon aria-hidden />
        </Button>
      )}
    </div>
  );
}
