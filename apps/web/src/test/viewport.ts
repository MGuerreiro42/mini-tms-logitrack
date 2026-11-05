const DESKTOP_WIDTH = 1280;

let width = DESKTOP_WIDTH;
let reducedMotion = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function setViewportWidth(next: number) {
  width = next;
  notify();
}

export function setReducedMotion(next: boolean) {
  reducedMotion = next;
  notify();
}

export function resetViewport() {
  width = DESKTOP_WIDTH;
  reducedMotion = false;
}

function matches(query: string): boolean {
  if (/prefers-reduced-motion:\s*reduce/.test(query)) return reducedMotion;
  const min = /min-width:\s*(\d+)px/.exec(query);
  const max = /max-width:\s*(\d+)px/.exec(query);
  if (!min && !max) return false;
  return (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
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
