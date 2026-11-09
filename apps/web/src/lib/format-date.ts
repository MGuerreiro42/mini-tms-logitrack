import { formatDuration } from './format-duration';

const TIME_ZONE = 'America/Sao_Paulo';

// Assembled from parts with a fixed locale, zone and 24h clock: ICU separators differ between Node and browsers and would break hydration.
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'shortOffset',
});

function partsOf(iso: string): Record<string, string> {
  return Object.fromEntries(
    formatter
      .formatToParts(new Date(iso))
      .map(({ type, value }) => [type, value]),
  );
}

export function formatDate(iso: string): string {
  const { month, day, year } = partsOf(iso);
  return `${month} ${day}, ${year}`;
}

export function formatShortDateTime(iso: string): string {
  const { month, day, hour, minute } = partsOf(iso);
  return `${month} ${day}, ${hour}:${minute}`;
}

export function formatWeekdayTime(iso: string): string {
  const { weekday, hour, minute } = partsOf(iso);
  return `${weekday} ${hour}:${minute}`;
}

export function formatMonthDay(iso: string): string {
  const { month, day } = partsOf(iso);
  return `${month} ${day}`;
}

export function formatDateTime(iso: string): string {
  const { hour, minute, timeZoneName } = partsOf(iso);
  return `${formatDate(iso)}, ${hour}:${minute} ${timeZoneName}`;
}

const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;

export function formatTimeAgo(iso: string, now: Date): string {
  const elapsed = now.getTime() - new Date(iso).getTime();
  if (elapsed < MS_PER_MINUTE) return 'just now';
  if (elapsed < 24 * MS_PER_HOUR)
    return `${formatDuration(elapsed / MS_PER_HOUR)} ago`;
  return formatShortDateTime(iso);
}

export function formatTimeUntil(iso: string, now: Date): string {
  const remaining = new Date(iso).getTime() - now.getTime();
  if (remaining < 1_000) return 'due now';
  if (remaining < MS_PER_MINUTE) return `in ${Math.round(remaining / 1_000)} s`;
  return `in ${formatDuration(remaining / MS_PER_HOUR)}`;
}
