const TIME_ZONE = 'America/Sao_Paulo';

// Assembled from parts with a fixed locale, zone and 24h clock: ICU separators differ between Node and browsers and would break hydration.
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
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

export function formatDateTime(iso: string): string {
  const { hour, minute, timeZoneName } = partsOf(iso);
  return `${formatDate(iso)}, ${hour}:${minute} ${timeZoneName}`;
}
