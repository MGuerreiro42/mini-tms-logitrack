import { randomBytes } from 'node:crypto';

export const TRACKING_CODE_PATTERN = /^TMS-[0-9A-F]{12}$/;

export const generateTrackingCode = (): string =>
  `TMS-${randomBytes(6).toString('hex').toUpperCase()}`;
