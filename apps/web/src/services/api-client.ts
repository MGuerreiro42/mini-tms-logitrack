const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

// NestJS's default exception filter shape: `message` is a plain string for
// most exceptions (ConflictException, BadRequestException with a single
// reason, NotFoundException) but an array for ValidationPipe failures — join
// it so callers always get one displayable string.
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

// `token` is an explicit parameter, not read internally, so this function
// works unchanged from Server Components (token read via next/headers'
// cookies()) and client hooks (token read via document.cookie) without ever
// importing next/headers into a file that also ships to the browser.
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
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? res.statusText);
    throw new ApiError(res.status, message, body?.error);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
