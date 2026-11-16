'use client';

import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isTyping } from '@/lib/is-typing';

const SEARCH_DEBOUNCE_MS = 300;

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
  // What this field last wrote, so the URL echoing it back leaves the draft alone.
  const [sent, setSent] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    // The URL moved on its own (back/forward, a removed chip): show what it holds.
    if (value !== sent) {
      setSent(value);
      setDraft(value);
    }
  }

  function send(text: string) {
    if (text === sent) return;
    setSent(text);
    onChange(text);
  }

  const sendLater = useEffectEvent(send);
  useEffect(() => {
    const timer = setTimeout(() => sendLater(draft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  const onSlash = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== '/' || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const focused = document.activeElement;
    if (isTyping(focused) || focused?.closest('[role="dialog"]')) return;
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
        onKeyDown={(event) => {
          if (event.key === 'Enter') send(draft.trim());
        }}
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
            send('');
            inputRef.current?.focus();
          }}
        >
          <XIcon aria-hidden />
        </Button>
      )}
    </div>
  );
}
