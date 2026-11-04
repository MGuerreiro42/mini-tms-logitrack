'use client';

import { useEffect, useRef, useState } from 'react';

// Counts, per row key, how often a row already on screen changed version; rows that just appeared don't count.
export function useRowFlashes<T>(
  rows: readonly T[],
  getKey: (row: T) => string,
  getVersion?: (row: T) => string,
): ReadonlyMap<string, number> {
  const previous = useRef<ReadonlyMap<string, string> | null>(null);
  const [flashes, setFlashes] = useState<ReadonlyMap<string, number>>(
    new Map(),
  );

  useEffect(() => {
    if (!getVersion) return;
    const current = new Map(rows.map((row) => [getKey(row), getVersion(row)]));
    const before = previous.current;
    previous.current = current;
    if (!before || document.visibilityState === 'hidden') return;

    const changed = [...current]
      .filter(
        ([key, version]) => before.has(key) && before.get(key) !== version,
      )
      .map(([key]) => key);
    if (changed.length === 0) return;

    setFlashes((counts) => {
      const next = new Map(counts);
      for (const key of changed) next.set(key, (next.get(key) ?? 0) + 1);
      return next;
    });
  }, [rows, getKey, getVersion]);

  return flashes;
}

// Alternating between two identical animations replays the flash on the same element.
export const rowFlashClass = (count = 0) =>
  count === 0
    ? undefined
    : count % 2 === 1
      ? 'animate-row-flash-a'
      : 'animate-row-flash-b';
