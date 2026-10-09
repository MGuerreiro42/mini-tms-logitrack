import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentError } from './segment-error';

describe('SegmentError', () => {
  it('retries the segment when asked', async () => {
    const retry = vi.fn();
    render(<SegmentError error={new Error('boom')} unstable_retry={retry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
