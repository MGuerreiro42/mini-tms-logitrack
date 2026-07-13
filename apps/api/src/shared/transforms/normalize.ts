// Shared `class-transformer` normalizers, applied at the DTO boundary (the
// global ValidationPipe has `transform: true`, so these run before the
// value ever reaches a service). Centralized so every entry point for a
// given field normalizes identically — repeating the same inline lambda at
// 6 call sites is what actually causes drift (one gets fixed, others don't).

export function toLowerTrimmed({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function toUpperTrimmed({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
