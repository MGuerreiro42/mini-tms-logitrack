// Single-hue ordinal ramp for charts where bar order carries meaning.
// Bounds from the dataviz palette: light starts at step 250, dark stops at 600; index 0 is lightest.
const LIGHT_STEPS = [
  '#86b6ef', // 250
  '#6da7ec', // 300
  '#5598e7', // 350
  '#3987e5', // 400
  '#2a78d6', // 450
  '#256abf', // 500
  '#1c5cab', // 550
  '#184f95', // 600
  '#104281', // 650
] as const;

const DARK_STEPS = [
  '#cde2fb', // 100
  '#b7d3f6', // 150
  '#9ec5f4', // 200
  '#86b6ef', // 250
  '#6da7ec', // 300
  '#5598e7', // 350
  '#3987e5', // 400
  '#2a78d6', // 450
  '#256abf', // 500
  '#1c5cab', // 550
  '#184f95', // 600
] as const;

export interface OrdinalRampStep {
  light: string;
  dark: string;
}

// Evenly spaced steps at the same relative positions in both modes.
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
