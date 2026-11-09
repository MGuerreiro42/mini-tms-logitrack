export function toTrimmed({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function toLowerTrimmed({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function toUpperTrimmed({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

export function toDigits({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.replace(/\D/g, '') : value;
}

// What coverage matching compares, so "São Paulo" and " sao paulo" are one city.
export const cityKey = (city: string): string =>
  city.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
