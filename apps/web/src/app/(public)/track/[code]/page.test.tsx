import { HttpResponse, http } from 'msw';
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

const API_URL = 'http://localhost:3333';

function props(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe('TrackingPage', () => {
  let requestedCodes: string[];

  beforeEach(() => {
    requestedCodes = [];
    server.use(
      http.get(`${API_URL}/public/tracking/:code`, ({ params }) => {
        requestedCodes.push(String(params.code));
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

  it('titles the page with the code and current status', async () => {
    expect(await generateMetadata(props('TMS-AAA111'))).toMatchObject({
      title: 'TMS-AAA111 · In transit · Mini TMS',
    });
  });
});
