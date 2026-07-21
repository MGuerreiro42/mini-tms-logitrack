// Single-hue (blue) ordinal ramp for charts where bar ORDER carries meaning
// (a funnel stage, a rank) — per the dataviz skill's color formula: ordinal
// gets one hue with monotone lightness steps, not the 8-hue categorical set
// (that's for series identity, which these charts don't need — the axis
// label already names each bar).
//
// Values are lifted directly from the skill's validated reference palette
// (references/palette.md), respecting its stated ordinal bounds: light must
// not start lighter than step 250 (2.06:1 on the light surface); dark must
// not go darker than step 600 (2.15:1 on the dark surface). Both arrays
// read "near-surface -> most-contrast" so index 0 is always the lightest
// step in its own mode.
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

// Picks `count` evenly-spaced steps across the ramp — the same relative
// positions in both modes, so a given rank/stage lands on a consistent
// "how far along" lightness regardless of theme.
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
