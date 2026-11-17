'use client';

import { type RefObject, useLayoutEffect, useRef } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { MOTION } from '@/lib/motion';

interface Seen {
  group: string;
  left: number;
  top: number;
}

// A 400 ms slide, then one pulse at its new place.
const SLIDE_SHARE = 0.67;

// Layout position on the page: unlike getBoundingClientRect it ignores scroll and a running transform.
function layoutPosition(element: HTMLElement) {
  let left = 0;
  let top = 0;
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.offsetParent as HTMLElement | null
  ) {
    left += node.offsetLeft;
    top += node.offsetTop;
  }
  return { left, top };
}

// FLIP for marks that move between groups (`data-flip-id`, `data-flip-group`): an element
// slides from where it was only when its group changed, so a mount, a reflow or a new id
// never animates.
export function useFlip(ref: RefObject<HTMLElement | null>) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const seen = useRef(new Map<string, Seen>());

  useLayoutEffect(() => {
    const next = new Map<string, Seen>();
    for (const element of ref.current?.querySelectorAll<HTMLElement>(
      '[data-flip-id]',
    ) ?? []) {
      const { flipId = '', flipGroup = '' } = element.dataset;
      const { left, top } = layoutPosition(element);
      const before = seen.current.get(flipId);
      if (!reduced && before && before.group !== flipGroup) {
        element.animate(
          [
            {
              transform: `translate(${before.left - left}px, ${before.top - top}px)`,
              easing: MOTION.easeEnter,
            },
            { transform: 'none', offset: SLIDE_SHARE },
            { transform: 'scale(1.6)', offset: (1 + SLIDE_SHARE) / 2 },
            { transform: 'none' },
          ],
          MOTION.durationSlow / SLIDE_SHARE,
        );
      }
      next.set(flipId, { group: flipGroup, left, top });
    }
    seen.current = next;
  });
}
