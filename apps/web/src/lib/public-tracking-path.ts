export function publicTrackingPath(trackingCode: string): string {
  return `/track/${encodeURIComponent(trackingCode)}`;
}
