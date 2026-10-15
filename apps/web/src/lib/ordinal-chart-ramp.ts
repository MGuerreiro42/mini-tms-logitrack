const LIGHT_STEPS = [
  '#86b6ef',
  '#6da7ec',
  '#5598e7',
  '#3987e5',
  '#2a78d6',
  '#256abf',
  '#1c5cab',
  '#184f95',
  '#104281',
] as const;

const DARK_STEPS = [
  '#cde2fb',
  '#b7d3f6',
  '#9ec5f4',
  '#86b6ef',
  '#6da7ec',
  '#5598e7',
  '#3987e5',
  '#2a78d6',
  '#256abf',
  '#1c5cab',
  '#184f95',
] as const;

export interface OrdinalRampStep {
  light: string;
  dark: string;
}

export function ordinalChartRamp(count: number): OrdinalRampStep[] {
  if (count <= 0) return [];
  if (count === 1) {
    const mid = Math.floor(LIGHT_STEPS.length / 2);
    return [{ light: LIGHT_STEPS[mid], dark: DARK_STEPS[mid] }];
  }

  return Array.from({ length: count }, (_, i) => {
    const lightIndex = Math.round((i * (LIGHT_STEPS.length - 1)) / (count - 1));
    const darkIndex = Math.round((i * (DARK_STEPS.length - 1)) / (count - 1));
    return { light: LIGHT_STEPS[lightIndex], dark: DARK_STEPS[darkIndex] };
  });
}
