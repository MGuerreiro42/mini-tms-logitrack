export function subscribeNever(): () => void {
  return () => {};
}
