export const DEMO_QUEUE = 'demo';
export const TICK_JOB = 'tick';

export const TICK_EVERY_MS = 20_000;

export const SIMULATOR_RANDOM = Symbol('SIMULATOR_RANDOM');
export type RandomSource = () => number;
