// A full document load drops the Router Cache, which a soft navigation would carry across sessions.
export function hardNavigate(path: string): void {
  window.location.assign(path);
}
