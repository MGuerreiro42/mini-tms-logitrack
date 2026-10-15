import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentError } from './segment-error';

describe('SegmentError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retries the segment when asked', async () => {
    const retry = vi.fn();
    render(<SegmentError error={new Error('boom')} unstable_retry={retry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('logs the error and shows its digest as a support reference', () => {
    const error = Object.assign(new Error('boom'), { digest: '4051723' });
    render(<SegmentError error={error} unstable_retry={vi.fn()} />);

    expect(console.error).toHaveBeenCalledWith(error);
    expect(screen.getByRole('alert')).toHaveTextContent('Reference: 4051723');
  });

  it('shows no reference for an error without a digest', () => {
    render(<SegmentError error={new Error('boom')} unstable_retry={vi.fn()} />);

    expect(screen.getByRole('alert')).not.toHaveTextContent('Reference');
  });
});
