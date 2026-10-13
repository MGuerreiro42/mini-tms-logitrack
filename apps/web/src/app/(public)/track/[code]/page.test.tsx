import { render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { headers } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { server } from '@/test/msw/server';
import TrackingPage, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('next/headers', () => ({ headers: vi.fn() }));

const API_URL = 'http://localhost:3333';

function props(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe('TrackingPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  let requestedCodes: string[];
  let forwardedFor: string | null;

  beforeEach(() => {
    requestedCodes = [];
    forwardedFor = null;
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': '198.51.100.4, 203.0.113.7' }) as never,
    );
    server.use(
      http.get(`${API_URL}/public/tracking/:code`, ({ params, request }) => {
        requestedCodes.push(String(params.code));
        forwardedFor = request.headers.get('x-forwarded-for');
        if (params.code === 'TMS-BUSY00') {
          return HttpResponse.json(
            { statusCode: 429, message: 'Too Many Requests' },
            { status: 429, headers: { 'Retry-After': '30' } },
          );
        }
        return params.code === 'TMS-AAA111'
          ? HttpResponse.json({
              trackingCode: 'TMS-AAA111',
              status: 'IN_TRANSIT',
              addressCity: 'São Paulo',
              addressState: 'SP',
              modalityName: 'Standard',
              events: [],
            })
          : HttpResponse.json(
              { statusCode: 404, message: 'Not found' },
              { status: 404 },
            );
      }),
    );
  });

  it('redirects a lowercase code to its canonical URL without asking the API', async () => {
    await expect(TrackingPage(props('tms-aaa111'))).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(permanentRedirect).toHaveBeenCalledWith('/track/TMS-AAA111');
    expect(requestedCodes).toEqual([]);
  });

  it('answers an unknown code with the not-found page', async () => {
    await expect(TrackingPage(props('TMS-000000'))).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );

    expect(notFound).toHaveBeenCalled();
  });

  it('looks the shipment up on behalf of the visitor, not the web server', async () => {
    await TrackingPage(props('TMS-AAA111'));

    expect(forwardedFor).toBe('203.0.113.7');
  });

  it('asks the visitor to wait when the lookup is rate limited', async () => {
    render(await TrackingPage(props('TMS-BUSY00')));

    expect(
      screen.getByRole('heading', { name: 'Too many requests' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you've looked up shipments too often/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/track/TMS-BUSY00',
    );
    expect(notFound).not.toHaveBeenCalled();
    expect(await generateMetadata(props('TMS-BUSY00'))).toEqual({
      title: 'Too many requests · Mini TMS',
    });
  });

  it('titles the page with the code and current status', async () => {
    expect(await generateMetadata(props('TMS-AAA111'))).toMatchObject({
      title: 'TMS-AAA111 · In transit · Mini TMS',
    });
  });
});
