import { MS_PER_HOUR } from '../../shared/stats/stats';

export const computeDueAt = (
  createdAt: Date,
  slaHours: number | null,
): Date | null =>
  slaHours == null
    ? null
    : new Date(createdAt.getTime() + slaHours * MS_PER_HOUR);
