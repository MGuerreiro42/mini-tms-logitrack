const TRACKING_CODE_PATTERN = /^TMS-[0-9A-F]{12}$/;

export function isTrackingCode(value: string): boolean {
  return TRACKING_CODE_PATTERN.test(value);
}

export function publicTrackingPath(trackingCode: string): string {
  return `/track/${encodeURIComponent(trackingCode)}`;
}
