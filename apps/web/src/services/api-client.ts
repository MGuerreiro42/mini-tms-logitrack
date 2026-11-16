import { API_URL } from '@/lib/api-url';
import { HTTP_STATUS } from '@/lib/http-status';

// Nest sends `message` as a string, or an array for validation errors.
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public error?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const RATE_LIMITED = 'Too many attempts. Wait a minute and try again.';

// A 429 body is the throttler's own wording ("ThrottlerException: …"), never copy for a person.
function errorMessage(res: Response, body: { message?: unknown } | null) {
  if (res.status === HTTP_STATUS.TOO_MANY_REQUESTS) return RATE_LIMITED;
  if (Array.isArray(body?.message)) return body.message.join(', ');
  if (typeof body?.message === 'string') return body.message;
  return res.statusText;
}

export function hasStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.statusCode === status;
}

export function isClientError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.statusCode < HTTP_STATUS.INTERNAL_SERVER_ERROR
  );
}

// fetch rejects with a TypeError when the server can't be reached, and AbortSignal.timeout with a
// TimeoutError; a 5xx means it answered but can't serve.
export function isServiceUnavailable(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof DOMException && error.name === 'TimeoutError') ||
    (error instanceof ApiError &&
      error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR)
  );
}

export async function apiClient<T>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, errorMessage(res, body), body?.error);
  }

  if (res.status === HTTP_STATUS.NO_CONTENT) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

type QueryValue = string | number | undefined;

export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
