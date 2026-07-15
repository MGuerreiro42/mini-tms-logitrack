import { HttpResponse, http } from 'msw';
import { server } from '@/test/msw/server';
import { ApiError, apiClient } from './api-client';

const API_URL = 'http://localhost:3333';

describe('apiClient', () => {
  it('returns the parsed JSON body on success', async () => {
    server.use(
      http.get(`${API_URL}/sellers/me`, () =>
        HttpResponse.json({ id: 'seller-1' }),
      ),
    );

    await expect(apiClient('/sellers/me')).resolves.toEqual({
      id: 'seller-1',
    });
  });

  it('attaches the Authorization header only when a token is given', async () => {
    let receivedAuth: string | null = null;
    server.use(
      http.get(`${API_URL}/sellers/me`, ({ request }) => {
        receivedAuth = request.headers.get('authorization');
        return HttpResponse.json({});
      }),
    );

    await apiClient('/sellers/me', undefined, 'my-token');
    expect(receivedAuth).toBe('Bearer my-token');

    await apiClient('/sellers/me');
    expect(receivedAuth).toBeNull();
  });

  it('returns undefined for a 204 No Content response', async () => {
    server.use(
      http.patch(
        `${API_URL}/sellers/1/approve`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(
      apiClient('/sellers/1/approve', { method: 'PATCH' }),
    ).resolves.toBeUndefined();
  });

  it('throws ApiError with the plain string message NestJS sends for most exceptions', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(
          {
            statusCode: 401,
            message: 'Invalid credentials',
            error: 'Unauthorized',
          },
          { status: 401 },
        ),
      ),
    );

    await expect(
      apiClient('/auth/login', { method: 'POST' }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    });
  });

  it('joins the message array NestJS sends for ValidationPipe failures', async () => {
    server.use(
      http.post(`${API_URL}/sellers`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: ['email must be an email', 'password too short'],
          },
          { status: 400 },
        ),
      ),
    );

    await expect(
      apiClient('/sellers', { method: 'POST' }),
    ).rejects.toMatchObject({
      message: 'email must be an email, password too short',
    });
  });

  it('falls back to statusText when the error body has no message', async () => {
    server.use(
      http.get(
        `${API_URL}/sellers/me`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    await expect(apiClient('/sellers/me')).rejects.toBeInstanceOf(ApiError);
  });
});
