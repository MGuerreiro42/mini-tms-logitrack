const DESKTOP_WIDTH = 1280;

let width = DESKTOP_WIDTH;
let rootFontSize = 16;
let reducedMotion = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function setViewportWidth(next: number) {
  width = next;
  notify();
}

export function setRootFontSize(next: number) {
  rootFontSize = next;
  notify();
}

export function setReducedMotion(next: boolean) {
  reducedMotion = next;
  notify();
}

export function resetViewport() {
  width = DESKTOP_WIDTH;
  rootFontSize = 16;
  reducedMotion = false;
}

function matches(query: string): boolean {
  if (/prefers-reduced-motion:\s*reduce/.test(query)) return reducedMotion;
  const min = /min-width:\s*([\d.]+)(px|rem)/.exec(query);
  const max = /max-width:\s*([\d.]+)(px|rem)/.exec(query);
  if (!min && !max) return false;
  const px = (m: RegExpExecArray) =>
    Number(m[1]) * (m[2] === 'rem' ? rootFontSize : 1);
  return (!min || width >= px(min)) && (!max || width <= px(max));
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return matches(query);
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
