export const DEMO_QUEUE = 'demo';
export const TICK_JOB = 'tick';
export const RESET_JOB = 'reset';

export const TICK_EVERY_MS = 10_000;
export const RESET_CRON = '0 4 * * *';
export const RESET_TIMEZONE = 'America/Sao_Paulo';

export const SIMULATOR_RANDOM = Symbol('SIMULATOR_RANDOM');
export type RandomSource = () => number;
