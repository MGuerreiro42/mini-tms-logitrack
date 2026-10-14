const DESKTOP_WIDTH = 1280;

let width = DESKTOP_WIDTH;

export function setViewportWidth(next: number) {
  width = next;
}

export function resetViewport() {
  width = DESKTOP_WIDTH;
}

function matches(query: string): boolean {
  const max = /max-width:\s*(\d+)px/.exec(query);
  return max ? width <= Number(max[1]) : false;
}

export function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
