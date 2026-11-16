// Below this many samples a rate or median is noise: shown as "—", never as a number.
export const MIN_SAMPLE = 5;

// The on-time target every on-time tile, row and chart draws.
export const ON_TIME_TARGET = 90;

export const hasEnoughData = (n: number) => n >= MIN_SAMPLE;

export const notEnoughNote = (n: number, noun: 'deliveries' | 'data') =>
  `Not enough ${noun} (n=${n})`;
