import type { ThemeProviderProps } from 'next-themes';

export const THEME_PROVIDER_PROPS = {
  attribute: 'class',
  defaultTheme: 'system',
  enableSystem: true,
  disableTransitionOnChange: true,
} satisfies ThemeProviderProps;
