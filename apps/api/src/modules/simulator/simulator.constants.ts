import { ShipmentStatus } from '../../../generated/prisma/client';

export const DEMO_QUEUE = 'demo';
export const TICK_JOB = 'tick';
export const DRIVE_JOB = 'drive';
export const RESET_JOB = 'reset';

export const TICK_EVERY_MS = 10_000;
export const DRIVE_EVERY_MS = 2_000;
// How long the simulated driver takes over each road stage (spec 03, User Story 3).
export const STAGE_DURATION_MS: Partial<Record<ShipmentStatus, number>> = {
  [ShipmentStatus.IN_TRANSIT]: 4 * 60_000,
  [ShipmentStatus.OUT_FOR_DELIVERY]: 2 * 60_000,
};
export const RESET_CRON = '0 4 * * *';
export const RESET_TIMEZONE = 'America/Sao_Paulo';

export const SIMULATOR_RANDOM = Symbol('SIMULATOR_RANDOM');
export type RandomSource = () => number;
