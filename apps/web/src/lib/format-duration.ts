const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

function oneDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

export function formatDuration(hours: number): string {
  const minutes = Math.round(hours * MINUTES_PER_HOUR);
  if (minutes < 1) return '< 1 min';
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;
  if (hours < HOURS_PER_DAY) return `${oneDecimal(hours)} h`;
  return `${oneDecimal(hours / HOURS_PER_DAY)} d`;
}

// A ticking "m:ss"; a partial second still counts, so it reads 0:01 until the end.
export function formatCountdown(ms: number): string {
  const seconds = Math.max(Math.ceil(ms / 1000), 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
