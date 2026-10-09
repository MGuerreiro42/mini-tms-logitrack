import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { PublicTrackingForm } from './public-tracking-form';

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));

describe('PublicTrackingForm', () => {
  it('navigates to the tracking page for the trimmed code', async () => {
    const push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<
      typeof useRouter
    >);
    const user = userEvent.setup();
    render(<PublicTrackingForm />);

    expect(
      screen.getByRole('button', { name: 'Track shipment' }),
    ).toBeDisabled();
    await user.type(screen.getByLabelText('Tracking code'), '  TMS-AAA111 ');
    await user.click(screen.getByRole('button', { name: 'Track shipment' }));

    expect(push).toHaveBeenCalledWith('/track/TMS-AAA111');
  });
});
