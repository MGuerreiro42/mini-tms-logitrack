import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { server } from '@/test/msw/server';
import { SegmentError } from './segment-error';

const HEALTH_URL = 'http://localhost:3333/health';

function healthAnswers(status: number) {
  server.use(http.get(HEALTH_URL, () => new HttpResponse(null, { status })));
}

describe('SegmentError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    healthAnswers(200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries the segment when asked', async () => {
    const retry = vi.fn();
    render(<SegmentError error={new Error('boom')} retry={retry} />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('logs the error and shows its digest as a support reference', async () => {
    const error = Object.assign(new Error('boom'), { digest: '4051723' });
    render(<SegmentError error={error} retry={vi.fn()} />);

    expect(console.error).toHaveBeenCalledWith(error);
    expect(await screen.findByText('Reference: 4051723')).toBeInTheDocument();
  });

  it('shows no reference for an error without a digest', async () => {
    render(<SegmentError error={new Error('boom')} retry={vi.fn()} />);

    await screen.findByText('Something went wrong');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Reference');
  });

  it.each([
    ['answers 5xx', () => healthAnswers(503)],
    [
      'cannot be reached',
      () => server.use(http.get(HEALTH_URL, () => HttpResponse.error())),
    ],
  ])('says the service is unavailable when the API %s', async (_, setup) => {
    setup();
    const retry = vi.fn();
    render(<SegmentError error={new Error('boom')} retry={retry} />);

    expect(
      await screen.findByText("We can't reach the Mini TMS service right now"),
    ).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('shows neither message while the probe is running', () => {
    render(<SegmentError error={new Error('boom')} retry={vi.fn()} />);

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});
