// For useSyncExternalStore over values that never change after hydration.
export function subscribeNever(): () => void {
  return () => {};
}
