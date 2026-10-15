const DESKTOP_WIDTH = 1280;

let width = DESKTOP_WIDTH;
const listeners = new Set<() => void>();

export function setViewportWidth(next: number) {
  width = next;
  for (const listener of listeners) listener();
}

export function resetViewport() {
  width = DESKTOP_WIDTH;
}

function matches(query: string): boolean {
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
